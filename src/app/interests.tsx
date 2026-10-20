import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Segmented, Txt, haptic } from '@/components/ui';
import { COUNTRIES } from '@/core/countries';
import { ENTITY_KINDS, entityTitle, followState, toggleFollow, toggleMute, type EntityKind, type FollowedEntity, type FollowState } from '@/core/newsPrefs';
import { FREE_NEWS_TOPICS } from '@/core/pro';
import { CATEGORIES, pathTitle, searchNodes, type NewsNode } from '@/core/taxonomy';
import { usePro } from '@/state/usePro';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

type Choices = { follows: string[]; muted: string[] };

const STATE_TEXT: Record<Exclude<FollowState, null>, string> = {
  followed: 'Following',
  muted: 'Muted',
  'followed-above': 'Included',
  'muted-above': 'Muted above',
};

/** Follow and mute buttons for one node. */
function NodeActions({ node, choices, onFollow, onMute }: { node: NewsNode; choices: Choices; onFollow: (id: string) => void; onMute: (id: string) => void }) {
  const state = followState(node.id, choices.follows, choices.muted);
  const followed = state === 'followed';
  const muted = state === 'muted';
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={() => onFollow(node.id)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: followed }}
        accessibilityLabel={followed ? `Stop following ${node.title}` : `Follow ${node.title}`}
        style={[styles.follow, followed && styles.followOn, state === 'followed-above' && styles.followInherited]}
      >
        <Text style={[styles.followText, followed && styles.followTextOn]}>{followed ? 'Following' : state === 'followed-above' ? 'Included' : 'Follow'}</Text>
      </Pressable>
      <Pressable
        onPress={() => onMute(node.id)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityState={{ selected: muted }}
        accessibilityLabel={muted ? `Unmute ${node.title}` : `Mute ${node.title}`}
        style={[styles.mute, muted && styles.muteOn]}
      >
        <Ionicons name={muted || state === 'muted-above' ? 'notifications-off' : 'notifications-off-outline'} size={17} color={muted ? colors.onAccent : state === 'muted-above' ? colors.danger : colors.textMuted} />
      </Pressable>
    </View>
  );
}

function NodeRow({ node, choices, open, onToggleOpen, onFollow, onMute, indent }: { node: NewsNode; choices: Choices; open: boolean; onToggleOpen?: () => void; onFollow: (id: string) => void; onMute: (id: string) => void; indent: number }) {
  const state = followState(node.id, choices.follows, choices.muted);
  return (
    <View style={[styles.nodeRow, { paddingLeft: space.lg + indent * space.lg }]}>
      <Pressable onPress={onToggleOpen} disabled={!onToggleOpen} style={styles.nodeTitle} accessibilityRole={onToggleOpen ? 'button' : 'text'} accessibilityState={onToggleOpen ? { expanded: open } : undefined}>
        <Text style={[styles.nodeText, (state === 'muted' || state === 'muted-above') && styles.nodeMuted]} numberOfLines={2}>
          {node.title}
        </Text>
        {onToggleOpen ? (
          <Text style={styles.nodeCount}>
            {node.children.length} {open ? '▴' : '▾'}
          </Text>
        ) : null}
      </Pressable>
      <NodeActions node={node} choices={choices} onFollow={onFollow} onMute={onMute} />
    </View>
  );
}

/** A category: its own buttons, then its topics (under their headings), each with its sub-topics. */
function CategoryCard({ category, choices, open, onToggleOpen, onFollow, onMute }: { category: (typeof CATEGORIES)[number]; choices: Choices; open: boolean; onToggleOpen: () => void; onFollow: (id: string) => void; onMute: (id: string) => void }) {
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const state = followState(category.id, choices.follows, choices.muted);
  const inside = [...choices.follows, ...choices.muted].filter((id) => id.startsWith(`${category.id}.`)).length;
  return (
    <View style={[styles.card, state === 'followed' && styles.cardOn]}>
      <View style={styles.cardHead}>
        <Pressable onPress={onToggleOpen} style={styles.cardTitleWrap} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${category.title}, ${category.children.length} topics`}>
          <Text style={styles.emoji}>{category.emoji}</Text>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{category.title}</Text>
            <Text style={styles.cardCount}>{state ? STATE_TEXT[state] : inside > 0 ? `${inside} chosen inside` : `${category.children.length} topics`}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </Pressable>
        <NodeActions node={category} choices={choices} onFollow={onFollow} onMute={onMute} />
      </View>
      {open ? (
        <View style={styles.tree}>
          {category.children.map((topic, i) => {
            const heading = topic.group && topic.group !== category.children[i - 1]?.group ? topic.group : null;
            const topicOpen = openTopic === topic.id;
            return (
              <View key={topic.id}>
                {heading ? <Txt variant="label" style={styles.groupLabel}>{heading}</Txt> : null}
                <NodeRow node={topic} choices={choices} indent={topic.group ? 1 : 0} open={topicOpen} onToggleOpen={topic.children.length ? () => setOpenTopic((o) => (o === topic.id ? null : topic.id)) : undefined} onFollow={onFollow} onMute={onMute} />
                {topicOpen
                  ? topic.children.map((sub, j) => (
                      <View key={sub.id}>
                        {sub.group && sub.group !== topic.children[j - 1]?.group ? <Txt variant="label" style={[styles.groupLabel, styles.subGroup]}>{sub.group}</Txt> : null}
                        <NodeRow node={sub} choices={choices} indent={(topic.group ? 2 : 1) + (sub.group ? 0.5 : 0)} open={false} onFollow={onFollow} onMute={onMute} />
                      </View>
                    ))
                  : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Follow a team, player, league, company, ticker, person, country, city or any keyword. */
function Entities({ entities, onAdd, onRemove }: { entities: FollowedEntity[]; onAdd: (e: FollowedEntity) => void; onRemove: (e: FollowedEntity) => void }) {
  const [kind, setKind] = useState<EntityKind>('team');
  const [name, setName] = useState('');
  const meta = ENTITY_KINDS.find((k) => k.id === kind)!;
  const q = name.trim().toLowerCase();
  const countries = kind === 'country' ? COUNTRIES.filter((c) => !q || c.name.toLowerCase().includes(q)) : [];
  const add = () => {
    if (!name.trim()) return;
    onAdd({ kind, name: name.trim() });
    setName('');
  };
  return (
    <View style={styles.entities}>
      <Txt variant="muted">Follow anything by name: its stories come from every publisher, in each of your languages.</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
        {ENTITY_KINDS.map((k) => (
          <Pressable key={k.id} onPress={() => setKind(k.id)} accessibilityRole="radio" accessibilityState={{ selected: kind === k.id }} style={[styles.chip, kind === k.id && styles.chipOn]}>
            <Text style={[styles.chipText, kind === k.id && styles.chipTextOn]}>{k.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.addRow}>
        <TextInput value={name} onChangeText={setName} placeholder={kind === 'country' ? 'Search countries' : meta.placeholder} placeholderTextColor={colors.textFaint} style={styles.addInput} autoCorrect={false} autoCapitalize={kind === 'ticker' ? 'characters' : 'words'} returnKeyType="done" onSubmitEditing={kind === 'country' ? undefined : add} accessibilityLabel={`${meta.title} to follow`} />
        {kind !== 'country' ? (
          <Pressable onPress={add} disabled={!name.trim()} style={[styles.addButton, !name.trim() && styles.disabled]} accessibilityRole="button" accessibilityLabel="Follow">
            <Ionicons name="add" size={22} color={colors.onAccent} />
          </Pressable>
        ) : null}
      </View>
      {kind === 'country' ? (
        <View style={styles.countryList}>
          {countries.map((c) => {
            const on = entities.some((e) => e.kind === 'country' && e.name === c.code);
            return (
              <Pressable key={c.code} onPress={() => (on ? onRemove({ kind: 'country', name: c.code }) : onAdd({ kind: 'country', name: c.code }))} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {entities.length > 0 ? (
        <>
          <Txt variant="label" style={styles.groupLabel}>You follow</Txt>
          {entities.map((e) => (
            <View key={`${e.kind}:${e.name}`} style={styles.entityRow}>
              <View style={styles.flex}>
                <Text style={styles.nodeText}>{entityTitle(e)}</Text>
                <Txt variant="caption">{ENTITY_KINDS.find((k) => k.id === e.kind)?.title}</Txt>
              </View>
              <Pressable onPress={() => onRemove(e)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Stop following ${entityTitle(e)}`}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** Pick news: follow or mute any category, topic or sub-topic, and follow names. On first launch, and from Settings or "Edit" on the feed. */
export default function Interests() {
  const { first, tab: startTab } = useLocalSearchParams<{ first?: string; tab?: string }>();
  const { data, updateSettings } = useStore();
  const insets = useSafeAreaInsets();
  const [choices, setChoices] = useState<Choices>(() => ({ follows: data.settings.newsTopics ?? [], muted: data.settings.news.muted }));
  const [entities, setEntities] = useState<FollowedEntity[]>(data.settings.news.entities);
  const [open, setOpen] = useState<string | null>(first ? 'world' : null);
  const [tab, setTab] = useState<'topics' | 'names'>(startTab === 'names' ? 'names' : 'topics');
  const [query, setQuery] = useState('');
  const matches = useMemo(() => searchNodes(query, 60), [query]);

  const { pro, unlock } = usePro();
  // The free plan follows a few topics. Sign-up isn't limited: the Pro trial starts right after it.
  const limited = !pro && !first;
  const count = choices.follows.length + entities.length;
  const overLimit = () => {
    if (limited && count + 1 > FREE_NEWS_TOPICS) {
      unlock('news_topics');
      return true;
    }
    return false;
  };
  const follow = (id: string) => {
    if (!choices.follows.includes(id) && overLimit()) return;
    haptic('select');
    setChoices((c) => toggleFollow(id, c.follows, c.muted));
  };
  const mute = (id: string) => {
    haptic('select');
    setChoices((c) => toggleMute(id, c.follows, c.muted));
  };
  const addEntity = (e: FollowedEntity) => {
    if (entities.some((x) => x.kind === e.kind && x.name.toLowerCase() === e.name.toLowerCase())) return;
    if (overLimit()) return;
    haptic('select');
    setEntities((list) => [...list, e]);
  };
  const removeEntity = (e: FollowedEntity) => setEntities((list) => list.filter((x) => !(x.kind === e.kind && x.name === e.name)));

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const save = (follows: string[]) => {
    updateSettings({ newsTopics: follows, news: { ...data.settings.news, muted: choices.muted, entities } });
    haptic('success');
    // During onboarding the next step is goals.
    if (first) router.replace({ pathname: '/goals', params: { first: '1' } });
    else close();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <View />
        <Pressable onPress={first ? () => save([]) : close} hitSlop={12} accessibilityRole="button" accessibilityLabel={first ? 'Skip' : 'Close without saving'}>
          {first ? <Txt style={styles.skip}>Skip</Txt> : <Ionicons name="close" size={30} color={colors.text} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          {first ? 'Your morning news' : 'Your news'}
        </Text>
        <Txt variant="muted" style={styles.subtitle}>
          {first
            ? 'Follow what you like: a whole category, or open it for topics and sub-topics. Mute anything you never want to see. You can change it any time.'
            : 'Follow or mute any category, topic or sub-topic. The closest choice wins: mute Football but follow Transfers, and you get transfers only.'}
        </Txt>
        <Segmented
          label="What to follow"
          options={[
            { value: 'topics', label: 'Topics' },
            { value: 'names', label: 'Teams, people & more' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'names' ? (
          <Entities entities={entities} onAdd={addEntity} onRemove={removeEntity} />
        ) : (
          <>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search 850 topics: a sport, a league, a company…" placeholderTextColor={colors.textFaint} style={styles.searchInput} autoCorrect={false} accessibilityLabel="Search topics" />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            {query.trim() ? (
              <View style={styles.card}>
                {matches.length === 0 ? (
                  <View style={styles.empty}>
                    <Txt variant="muted">{`No topic matches “${query.trim()}”.`}</Txt>
                    <Pressable onPress={() => setTab('names')} accessibilityRole="button">
                      <Txt style={styles.link}>{`Follow “${query.trim()}” as a keyword →`}</Txt>
                    </Pressable>
                  </View>
                ) : (
                  matches.map((n) => (
                    <View key={n.id} style={styles.nodeRow}>
                      <View style={styles.nodeTitle}>
                        <Text style={styles.nodeText} numberOfLines={2}>
                          {n.title}
                        </Text>
                        <Txt variant="caption" numberOfLines={1}>
                          {pathTitle(n.id).split(' › ').slice(0, -1).join(' › ') || 'Category'}
                        </Txt>
                      </View>
                      <NodeActions node={n} choices={choices} onFollow={follow} onMute={mute} />
                    </View>
                  ))
                )}
              </View>
            ) : (
              CATEGORIES.map((c) => <CategoryCard key={c.id} category={c} choices={choices} open={open === c.id} onToggleOpen={() => setOpen((o) => (o === c.id ? null : c.id))} onFollow={follow} onMute={mute} />)
            )}
          </>
        )}
        <Txt variant="caption" style={styles.sources}>
          Over 350 publishers, broadcasters and official sources in many languages, plus Google News in 23 editions. Ryz shows headlines, short summaries and pictures, and every story opens on its publisher’s site.
        </Txt>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <PressableScale onPress={() => save(choices.follows)} disabled={count === 0 && Boolean(first)} style={styles.save} accessibilityLabel="Save">
          <Text style={styles.saveText}>{count === 0 ? (first ? 'Follow something' : 'Turn off news') : `Done · following ${count}${choices.muted.length ? ` · ${choices.muted.length} muted` : ''}`}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44 },
  skip: { fontSize: 17, fontFamily: FONT.regular, color: colors.textMuted },
  content: { paddingHorizontal: space.lg, gap: space.md },
  title: { fontSize: 42, lineHeight: 48, fontFamily: FONT.display, color: colors.text, paddingHorizontal: space.xs },
  subtitle: { paddingHorizontal: space.xs, marginBottom: space.xs },
  card: { borderRadius: radius.md + 6, backgroundColor: colors.surface, overflow: 'hidden' },
  cardOn: { borderWidth: 1, borderColor: colors.borderStrong },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.md },
  cardTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingRight: space.xs },
  emoji: { fontSize: 26, width: 34, textAlign: 'center' },
  cardTitle: { fontSize: 17, lineHeight: 22, fontFamily: FONT.medium, color: colors.text },
  cardCount: { fontSize: 13, lineHeight: 18, fontFamily: FONT.light, color: colors.textMuted },
  tree: { paddingBottom: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  groupLabel: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  subGroup: { paddingLeft: space.xxl + space.lg },
  nodeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.lg, minHeight: 50 },
  nodeTitle: { flex: 1, flexDirection: 'column', gap: 2 },
  nodeText: { fontSize: 16, lineHeight: 21, fontFamily: FONT.regular, color: colors.text },
  nodeMuted: { color: colors.textFaint, textDecorationLine: 'line-through' },
  nodeCount: { fontSize: 12, fontFamily: FONT.light, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  follow: { minWidth: 86, height: 32, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  followOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  followInherited: { borderStyle: 'dashed' },
  followText: { fontSize: 14, fontFamily: FONT.medium, color: colors.text },
  followTextOn: { color: colors.onAccent },
  mute: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  muteOn: { backgroundColor: colors.danger },
  chip: { minHeight: 36, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  chipTextOn: { color: colors.onAccent },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 46, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchInput: { flex: 1, height: '100%', fontSize: 16, fontFamily: FONT.regular, color: colors.text, paddingVertical: 0 },
  empty: { padding: space.lg, gap: space.sm },
  link: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  entities: { gap: space.md },
  kinds: { gap: space.sm },
  addRow: { flexDirection: 'row', gap: space.sm },
  addInput: { flex: 1, height: 46, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.surface, fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  countryList: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sources: { textAlign: 'center', marginTop: space.md, paddingHorizontal: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 17, fontFamily: FONT.semibold, color: colors.onAccent },
});
