import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Segmented, Txt, confirm, haptic, type IconName } from '@/components/ui';
import { COUNTRIES } from '@/core/countries';
import { ENTITY_KINDS, entityTitle, followState, toggleFollow, toggleMute, type EntityKind, type FollowedEntity } from '@/core/newsPrefs';
import { FREE_NEWS_TOPICS } from '@/core/pro';
import { CATEGORIES, nodeById, pathTitle, searchNodes, type NewsCategory, type NewsNode } from '@/core/taxonomy';
import { usePro } from '@/state/usePro';
import { useStore } from '@/state/store';
import { FONT, colors, radius, space } from '@/theme';

type Choices = { follows: string[]; muted: string[] };
/** What tapping a topic does in a category: follow it or mute it. */
type TapMode = 'follow' | 'mute';

/** A topic as a pill: white when followed, dashed when included by a followed parent, red when muted. */
function TopicChip({ node, choices, onPress, strong }: { node: NewsNode; choices: Choices; onPress: (id: string) => void; strong?: boolean }) {
  const state = followState(node.id, choices.follows, choices.muted);
  const label = state === 'followed' ? 'following' : state === 'muted' ? 'muted' : state === 'followed-above' ? 'included' : state === 'muted-above' ? 'muted above' : 'not chosen';
  return (
    <Pressable
      onPress={() => onPress(node.id)}
      accessibilityRole="button"
      accessibilityLabel={`${node.title}, ${label}`}
      style={({ pressed }) => [
        styles.chip,
        strong && styles.chipStrong,
        state === 'followed' && styles.chipOn,
        state === 'followed-above' && styles.chipIncluded,
        state === 'muted' && styles.chipMuted,
        state === 'muted-above' && styles.chipMutedAbove,
        pressed && styles.pressed,
      ]}
    >
      {state === 'followed' ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : null}
      {state === 'muted' ? <Ionicons name="notifications-off" size={14} color={colors.danger} /> : null}
      <Text style={[styles.chipText, strong && styles.chipTextStrong, state === 'followed' && styles.chipTextOn, (state === 'muted' || state === 'muted-above') && styles.chipTextMuted]}>{node.title}</Text>
    </Pressable>
  );
}

/** One category in the grid: its icon and how much of it you've chosen. */
function CategoryTile({ category, choices, onOpen }: { category: NewsCategory; choices: Choices; onOpen: () => void }) {
  const state = followState(category.id, choices.follows, choices.muted);
  const inside = choices.follows.filter((id) => id.startsWith(`${category.id}.`)).length;
  const muted = choices.muted.filter((id) => id.startsWith(`${category.id}.`)).length;
  const on = state === 'followed';
  const caption = on ? 'Following all' : state === 'muted' ? 'Muted' : inside ? `${inside} followed` : muted ? `${muted} muted` : `${category.children.length} topics`;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${category.title}: ${caption}`} style={({ pressed }) => [styles.tile, on && styles.tileOn, inside > 0 && !on && styles.tilePartly, state === 'muted' && styles.tileMuted, pressed && styles.pressed]}>
      <Ionicons name={category.icon as IconName} size={24} color={on ? colors.onAccent : state === 'muted' ? colors.danger : colors.text} />
      <Text style={[styles.tileTitle, on && styles.tileTextOn]} numberOfLines={2}>
        {category.title}
      </Text>
      <Text style={[styles.tileCaption, on && styles.tileTextOn]}>{caption}</Text>
    </Pressable>
  );
}

/** Inside a category: follow or mute all of it, then tap topics and sub-topics. */
function CategoryDetail({ category, choices, mode, onMode, onTap, onBack }: { category: NewsCategory; choices: Choices; mode: TapMode; onMode: (m: TapMode) => void; onTap: (id: string) => void; onBack: () => void }) {
  const state = followState(category.id, choices.follows, choices.muted);
  const leaves = category.children.filter((t) => t.children.length === 0);
  const branches = category.children.filter((t) => t.children.length > 0);
  // Topics without sub-topics, in their headings ("Industries", "Other team sports"…).
  const leafGroups = leaves.reduce<{ label: string | null; nodes: NewsNode[] }[]>((acc, n) => {
    const label = n.group ?? null;
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.nodes.push(n);
    else acc.push({ label, nodes: [n] });
    return acc;
  }, []);
  return (
    <View style={styles.detail}>
      <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" style={styles.back}>
        <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
        <Txt variant="muted">All categories</Txt>
      </Pressable>
      <View style={styles.detailHead}>
        <View style={[styles.detailIcon, state === 'followed' && styles.detailIconOn]}>
          <Ionicons name={category.icon as IconName} size={26} color={state === 'followed' ? colors.onAccent : colors.text} />
        </View>
        <Text style={styles.detailTitle} accessibilityRole="header">
          {category.title}
        </Text>
      </View>
      <View style={styles.wholeRow}>
        <Pressable onPress={() => onTap(category.id)} accessibilityRole="button" style={[styles.wholeButton, state === 'followed' && styles.wholeOn, state === 'muted' && styles.wholeMuted]}>
          <Ionicons name={state === 'followed' ? 'checkmark' : state === 'muted' ? 'notifications-off' : mode === 'follow' ? 'add' : 'notifications-off-outline'} size={18} color={state === 'followed' ? colors.onAccent : state === 'muted' ? colors.danger : colors.text} />
          <Text style={[styles.wholeText, state === 'followed' && styles.chipTextOn]}>
            {state === 'followed' ? `Following all of ${category.title}` : state === 'muted' ? `${category.title} is muted` : mode === 'follow' ? `Follow all of ${category.title}` : `Mute all of ${category.title}`}
          </Text>
        </Pressable>
      </View>
      <Segmented
        label="What a tap does"
        options={[
          { value: 'follow', label: 'Tap to follow' },
          { value: 'mute', label: 'Tap to mute' },
        ]}
        value={mode}
        onChange={onMode}
      />
      <Txt variant="caption">
        {mode === 'follow' ? 'White means followed; dashed means included because you follow the whole category.' : 'Red means muted: those stories never show, even inside something you follow.'}
      </Txt>
      {leafGroups.map((g, i) => (
        <View key={`${g.label ?? 'topics'}${i}`} style={styles.section}>
          <Txt variant="label">{g.label ?? 'Topics'}</Txt>
          <View style={styles.cloud}>
            {g.nodes.map((n) => (
              <TopicChip key={n.id} node={n} choices={choices} onPress={onTap} />
            ))}
          </View>
        </View>
      ))}
      {branches.map((t) => {
        const subGroups = t.children.reduce<{ label: string | null; nodes: NewsNode[] }[]>((acc, n) => {
          const label = n.group ?? null;
          const last = acc[acc.length - 1];
          if (last && last.label === label) last.nodes.push(n);
          else acc.push({ label, nodes: [n] });
          return acc;
        }, []);
        return (
          <View key={t.id} style={styles.branch}>
            {t.group ? <Txt variant="label">{t.group}</Txt> : null}
            <TopicChip node={t} choices={choices} onPress={onTap} strong />
            {subGroups.map((g, i) => (
              <View key={`${t.id}${i}`} style={styles.subSection}>
                {g.label ? <Text style={styles.subLabel}>{g.label}</Text> : null}
                <View style={styles.cloud}>
                  {g.nodes.map((n) => (
                    <TopicChip key={n.id} node={n} choices={choices} onPress={onTap} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** What you follow and mute so far, one tap to remove. */
function Chosen({ choices, entities, onRemove, onRemoveEntity }: { choices: Choices; entities: FollowedEntity[]; onRemove: (id: string) => void; onRemoveEntity: (e: FollowedEntity) => void }) {
  if (!choices.follows.length && !choices.muted.length && !entities.length) return null;
  return (
    <View style={styles.chosen}>
      <Txt variant="label">{`Following ${choices.follows.length + entities.length}${choices.muted.length ? ` · muted ${choices.muted.length}` : ''}`}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chosenRow} style={styles.chosenScroll}>
        {choices.follows.map((id) => (
          <Pressable key={id} onPress={() => onRemove(id)} accessibilityRole="button" accessibilityLabel={`Stop following ${nodeById(id)?.title ?? id}`} style={[styles.chip, styles.chipOn]}>
            <Text style={[styles.chipText, styles.chipTextOn]}>{nodeById(id)?.title ?? id}</Text>
            <Ionicons name="close" size={14} color={colors.onAccent} />
          </Pressable>
        ))}
        {entities.map((e) => (
          <Pressable key={`${e.kind}:${e.name}`} onPress={() => onRemoveEntity(e)} accessibilityRole="button" accessibilityLabel={`Stop following ${entityTitle(e)}`} style={[styles.chip, styles.chipOn]}>
            <Text style={[styles.chipText, styles.chipTextOn]}>{entityTitle(e)}</Text>
            <Ionicons name="close" size={14} color={colors.onAccent} />
          </Pressable>
        ))}
        {choices.muted.map((id) => (
          <Pressable key={id} onPress={() => onRemove(id)} accessibilityRole="button" accessibilityLabel={`Unmute ${nodeById(id)?.title ?? id}`} style={[styles.chip, styles.chipMuted]}>
            <Ionicons name="notifications-off" size={14} color={colors.danger} />
            <Text style={[styles.chipText, styles.chipTextMuted]}>{nodeById(id)?.title ?? id}</Text>
            <Ionicons name="close" size={14} color={colors.danger} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** Followed, muted or not, for a search result. */
function ResultState({ node, choices }: { node: NewsNode; choices: Choices }) {
  const state = followState(node.id, choices.follows, choices.muted);
  if (state === 'followed') return <Ionicons name="checkmark-circle" size={24} color={colors.text} />;
  if (state === 'muted') return <Ionicons name="notifications-off" size={22} color={colors.danger} />;
  if (state === 'followed-above') return <Ionicons name="checkmark-circle-outline" size={24} color={colors.textMuted} />;
  return <Ionicons name="add-circle-outline" size={24} color={colors.textMuted} />;
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
  const [open, setOpen] = useState<string | null>(null);
  const [mode, setMode] = useState<TapMode>('follow');
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
  /** Inside a category a tap follows or mutes, depending on the mode. */
  const tap = (id: string) => (mode === 'follow' ? follow(id) : mute(id));
  /** From the Following strip: undo whatever was chosen. */
  const unchoose = (id: string) => {
    haptic('select');
    setChoices((c) => ({ follows: c.follows.filter((x) => x !== id), muted: c.muted.filter((x) => x !== id) }));
  };
  const openCategory = open ? (CATEGORIES.find((c) => c.id === open) ?? null) : null;
  const scroll = useRef<ScrollView>(null);
  // Opening or leaving a category starts at the top of the page.
  const goTo = (id: string | null) => {
    setOpen(id);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const addEntity = (e: FollowedEntity) => {
    if (entities.some((x) => x.kind === e.kind && x.name.toLowerCase() === e.name.toLowerCase())) return;
    if (overLimit()) return;
    haptic('select');
    setEntities((list) => [...list, e]);
  };
  const removeEntity = (e: FollowedEntity) => setEntities((list) => list.filter((x) => !(x.kind === e.kind && x.name === e.name)));
  // Start over: nothing followed, nothing muted. Saved when you tap Done, so closing with ✕ keeps your old picks.
  const eraseAll = () =>
    confirm('Erase your news choices?', 'Every topic, name and mute is cleared so you can choose again. Nothing changes until you tap Done.', 'Erase', () => {
      haptic('success');
      setChoices({ follows: [], muted: [] });
      setEntities([]);
      setQuery('');
      setOpen(null);
    });
  const anything = choices.follows.length + choices.muted.length + entities.length > 0;

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
      <ScrollView ref={scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} keyboardShouldPersistTaps="handled">
        {openCategory ? null : (
          <>
            <Text style={styles.title} accessibilityRole="header">
              {first ? 'Your morning news' : 'Your news'}
            </Text>
            <Txt variant="muted" style={styles.subtitle}>
              {first ? 'Tap a category to choose its topics, or follow it whole. You can change it any time.' : 'Tap a category to follow or mute its topics. The closest choice wins: mute Football but follow Transfers, and you get transfers only.'}
            </Txt>
          </>
        )}
        {openCategory ? null : <Chosen choices={choices} entities={entities} onRemove={unchoose} onRemoveEntity={removeEntity} />}
        {openCategory ? null : (
        <Segmented
          label="What to follow"
          options={[
            { value: 'topics', label: 'Topics' },
            { value: 'names', label: 'Teams, people & more' },
          ]}
          value={tab}
          onChange={setTab}
        />
        )}
        {openCategory && tab === 'topics' ? (
          <CategoryDetail category={openCategory} choices={choices} mode={mode} onMode={setMode} onTap={tap} onBack={() => goTo(null)} />
        ) : tab === 'names' ? (
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
              <View>
                {matches.length === 0 ? (
                  <View style={styles.empty}>
                    <Txt variant="muted">{`No topic matches “${query.trim()}”.`}</Txt>
                    <Pressable onPress={() => setTab('names')} accessibilityRole="button">
                      <Txt style={styles.link}>{`Follow “${query.trim()}” as a keyword →`}</Txt>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.results}>
                    <Txt variant="caption">Tap to follow; hold to mute.</Txt>
                    {matches.map((n) => (
                      <Pressable key={n.id} onPress={() => follow(n.id)} onLongPress={() => mute(n.id)} accessibilityRole="button" accessibilityHint="Tap to follow, hold to mute" style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}>
                        <View style={styles.flex}>
                          <Text style={styles.resultTitle} numberOfLines={2}>
                            {n.title}
                          </Text>
                          <Txt variant="caption" numberOfLines={1}>
                            {pathTitle(n.id).split(' › ').slice(0, -1).join(' › ') || 'Category'}
                          </Txt>
                        </View>
                        <ResultState node={n} choices={choices} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.grid}>
                {CATEGORIES.map((c) => (
                  <CategoryTile key={c.id} category={c} choices={choices} onOpen={() => goTo(c.id)} />
                ))}
              </View>
            )}
          </>
        )}
        {anything ? (
          <Pressable onPress={eraseAll} style={styles.erase} accessibilityRole="button" accessibilityLabel="Erase all your news choices">
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.eraseText}>Erase all my choices</Text>
          </Pressable>
        ) : null}
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
  pressed: { opacity: 0.6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 44 },
  skip: { fontSize: 17, fontFamily: FONT.regular, color: colors.textMuted },
  content: { paddingHorizontal: space.lg, gap: space.md },
  title: { fontSize: 42, lineHeight: 48, fontFamily: FONT.display, color: colors.text, paddingHorizontal: space.xs },
  subtitle: { paddingHorizontal: space.xs, marginBottom: space.xs },
  // Category grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '48.5%', minHeight: 112, padding: space.md + 2, borderRadius: radius.md + 4, backgroundColor: colors.surface, gap: 6, justifyContent: 'space-between', borderWidth: 1, borderColor: 'transparent' },
  tileOn: { backgroundColor: colors.accent },
  tilePartly: { borderColor: colors.borderStrong },
  tileMuted: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  tileTitle: { fontSize: 16, lineHeight: 20, fontFamily: FONT.medium, color: colors.text },
  tileCaption: { fontSize: 13, lineHeight: 17, fontFamily: FONT.light, color: colors.textMuted },
  tileTextOn: { color: colors.onAccent },
  // Chips
  cloud: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, paddingHorizontal: space.md + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderStrong, alignSelf: 'flex-start' },
  chipStrong: { minHeight: 40, borderColor: colors.text },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipIncluded: { borderStyle: 'dashed', borderColor: colors.textMuted },
  chipMuted: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  chipMutedAbove: { borderColor: colors.border },
  chipText: { fontSize: 15, fontFamily: FONT.regular, color: colors.text },
  chipTextStrong: { fontFamily: FONT.medium, fontSize: 16 },
  chipTextOn: { color: colors.onAccent },
  chipTextMuted: { color: colors.danger, textDecorationLine: 'line-through' },
  // Category page
  detail: { gap: space.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', minHeight: 36 },
  detailHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  detailIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  detailIconOn: { backgroundColor: colors.accent },
  detailTitle: { flex: 1, fontSize: 34, lineHeight: 39, fontFamily: FONT.display, color: colors.text },
  wholeRow: { flexDirection: 'row' },
  wholeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: space.md },
  wholeOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  wholeMuted: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  wholeText: { fontSize: 15, fontFamily: FONT.medium, color: colors.text, flexShrink: 1 },
  section: { gap: space.sm, marginTop: space.sm },
  branch: { gap: space.sm, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  subSection: { gap: 6, paddingLeft: space.md },
  subLabel: { fontSize: 13, fontFamily: FONT.medium, color: colors.textMuted },
  // Following strip
  chosen: { gap: space.sm },
  chosenScroll: { marginHorizontal: -space.lg },
  chosenRow: { gap: space.sm, paddingHorizontal: space.lg },
  // Search
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 46, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchInput: { flex: 1, height: '100%', fontSize: 16, fontFamily: FONT.regular, color: colors.text, paddingVertical: 0 },
  results: { gap: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  resultTitle: { fontSize: 16, lineHeight: 21, fontFamily: FONT.regular, color: colors.text },
  empty: { padding: space.lg, gap: space.sm },
  link: { fontSize: 15, fontFamily: FONT.medium, color: colors.text },
  // Names tab
  entities: { gap: space.md },
  kinds: { gap: space.sm },
  addRow: { flexDirection: 'row', gap: space.sm },
  addInput: { flex: 1, height: 46, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.surface, fontSize: 16, fontFamily: FONT.regular, color: colors.text },
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  countryList: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  entityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  nodeText: { fontSize: 16, lineHeight: 21, fontFamily: FONT.regular, color: colors.text },
  groupLabel: { paddingTop: space.md, paddingBottom: space.xs },
  // Bottom
  erase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 50, marginTop: space.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  eraseText: { fontSize: 16, fontFamily: FONT.medium, color: colors.danger },
  sources: { textAlign: 'center', marginTop: space.md, paddingHorizontal: space.lg },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: colors.bg },
  save: { height: 56, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: 17, fontFamily: FONT.semibold, color: colors.onAccent },
});
