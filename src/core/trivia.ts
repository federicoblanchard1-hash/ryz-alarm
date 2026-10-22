import { shuffleBag, type Random } from './missions';

// Morning trivia: general knowledge with four choices. The first choice is the
// right one; the screen shuffles them. Facts are stable ones (no "current"
// records or office holders) so they don't go out of date.

export interface TriviaQuestion {
  q: string;
  /** The right answer first, then three wrong ones. */
  a: [string, string, string, string];
}

export const TRIVIA: TriviaQuestion[] = [
  { q: 'Which planet is closest to the Sun?', a: ['Mercury', 'Venus', 'Mars', 'Earth'] },
  { q: 'How many minutes are in a day?', a: ['1,440', '1,240', '1,600', '3,600'] },
  { q: 'What gas do plants take in from the air to make food?', a: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
  { q: 'Which is the largest ocean?', a: ['Pacific', 'Atlantic', 'Indian', 'Arctic'] },
  { q: 'How many legs does a spider have?', a: ['8', '6', '10', '12'] },
  { q: 'What is the chemical symbol for gold?', a: ['Au', 'Ag', 'Gd', 'Go'] },
  { q: 'Which planet is known as the Red Planet?', a: ['Mars', 'Jupiter', 'Venus', 'Saturn'] },
  { q: 'What is the capital of Japan?', a: ['Tokyo', 'Kyoto', 'Osaka', 'Seoul'] },
  { q: 'How many sides does a hexagon have?', a: ['6', '5', '7', '8'] },
  { q: 'Which organ pumps blood around the body?', a: ['The heart', 'The lungs', 'The liver', 'The kidneys'] },
  { q: 'At sea level, at what temperature does water boil?', a: ['100 °C', '90 °C', '80 °C', '120 °C'] },
  { q: 'Who painted the Mona Lisa?', a: ['Leonardo da Vinci', 'Michelangelo', 'Raphael', 'Vincent van Gogh'] },
  { q: 'What is the largest planet in our solar system?', a: ['Jupiter', 'Saturn', 'Neptune', 'Earth'] },
  { q: 'Which animal is the largest on Earth?', a: ['Blue whale', 'African elephant', 'Giraffe', 'Great white shark'] },
  { q: 'How many continents are there?', a: ['7', '5', '6', '8'] },
  { q: 'What is the hardest natural substance?', a: ['Diamond', 'Gold', 'Iron', 'Quartz'] },
  { q: 'Which language has the most native speakers?', a: ['Mandarin Chinese', 'English', 'Spanish', 'Hindi'] },
  { q: 'What is the capital of Australia?', a: ['Canberra', 'Sydney', 'Melbourne', 'Perth'] },
  { q: 'How many bones are in an adult human body?', a: ['206', '186', '226', '306'] },
  { q: 'Which gas makes up most of the air we breathe?', a: ['Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'] },
  { q: 'What is the longest river in South America?', a: ['Amazon', 'Paraná', 'Orinoco', 'Magdalena'] },
  { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'] },
  { q: 'Which country gave the Statue of Liberty to the United States?', a: ['France', 'England', 'Spain', 'Italy'] },
  { q: 'How many hours does the Earth take to spin once, roughly?', a: ['24', '12', '36', '48'] },
  { q: 'What do bees make?', a: ['Honey', 'Silk', 'Sugar', 'Milk'] },
  { q: 'Which instrument has 88 keys?', a: ['Piano', 'Organ', 'Accordion', 'Harp'] },
  { q: 'What is the freezing point of water in Fahrenheit?', a: ['32 °F', '0 °F', '100 °F', '212 °F'] },
  { q: 'Which is the tallest mountain above sea level?', a: ['Everest', 'K2', 'Kilimanjaro', 'Mont Blanc'] },
  { q: 'Which hormone does darkness tell your body to release before sleep?', a: ['Melatonin', 'Adrenaline', 'Insulin', 'Cortisol'] },
  { q: 'What colour do you get by mixing blue and yellow?', a: ['Green', 'Purple', 'Orange', 'Brown'] },
  { q: 'Which country is home to the kangaroo?', a: ['Australia', 'South Africa', 'Brazil', 'New Zealand'] },
  { q: 'How many players are on the pitch for one football (soccer) team?', a: ['11', '10', '9', '12'] },
  { q: 'What is the largest desert in the world, counting cold deserts?', a: ['Antarctica', 'Sahara', 'Gobi', 'Arabian'] },
  { q: 'Which metal is liquid at room temperature?', a: ['Mercury', 'Lead', 'Tin', 'Aluminium'] },
  { q: 'Who wrote "Romeo and Juliet"?', a: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'] },
  { q: 'What is the capital of Canada?', a: ['Ottawa', 'Toronto', 'Montreal', 'Vancouver'] },
  { q: 'How many days are in a leap year?', a: ['366', '365', '364', '360'] },
  { q: 'Which planet has the most famous rings?', a: ['Saturn', 'Uranus', 'Mars', 'Mercury'] },
  { q: 'What is H₂O better known as?', a: ['Water', 'Salt', 'Hydrogen', 'Air'] },
  { q: 'Which part of the eye controls how much light gets in?', a: ['The iris', 'The lens', 'The retina', 'The cornea'] },
  { q: 'How many strings does a standard guitar have?', a: ['6', '4', '5', '8'] },
  { q: 'What is the largest country by area?', a: ['Russia', 'Canada', 'China', 'United States'] },
  { q: 'Which bird is the symbol of peace?', a: ['Dove', 'Eagle', 'Swan', 'Owl'] },
  { q: 'What is 15% of 200?', a: ['30', '15', '20', '35'] },
  { q: 'Which vitamin does your skin make in sunlight?', a: ['Vitamin D', 'Vitamin C', 'Vitamin A', 'Vitamin B12'] },
  { q: 'In which city is the Colosseum?', a: ['Rome', 'Athens', 'Istanbul', 'Paris'] },
  { q: 'How many sides does a triangle have?', a: ['3', '4', '2', '5'] },
  { q: 'What is the main language spoken in Brazil?', a: ['Portuguese', 'Spanish', 'English', 'French'] },
  { q: 'Which part of a plant takes up water from the soil?', a: ['The roots', 'The leaves', 'The flowers', 'The stem'] },
  { q: 'What is the speed of light, roughly?', a: ['300,000 km/s', '30,000 km/s', '3,000 km/s', '3 million km/s'] },
  { q: 'Which shape has four equal sides and four right angles?', a: ['Square', 'Rhombus', 'Rectangle', 'Trapezium'] },
  { q: 'What do caterpillars turn into?', a: ['Butterflies or moths', 'Beetles', 'Bees', 'Spiders'] },
  { q: 'What is the capital of Italy?', a: ['Rome', 'Milan', 'Venice', 'Florence'] },
  { q: 'How many weeks are in a year?', a: ['52', '48', '50', '56'] },
  { q: 'Which is the closest star to Earth?', a: ['The Sun', 'Proxima Centauri', 'Sirius', 'Polaris'] },
  { q: 'What is the main ingredient in guacamole?', a: ['Avocado', 'Tomato', 'Pea', 'Cucumber'] },
  { q: 'Which sense does the cochlea help with?', a: ['Hearing', 'Smell', 'Taste', 'Sight'] },
  { q: 'What is 9 × 8?', a: ['72', '64', '81', '68'] },
  { q: 'Which ocean lies between Africa and Australia?', a: ['Indian', 'Pacific', 'Atlantic', 'Southern'] },
  { q: 'What is the boiling point of water in Fahrenheit, at sea level?', a: ['212 °F', '100 °F', '180 °F', '232 °F'] },
  { q: 'Which famous scientist developed the theory of relativity?', a: ['Albert Einstein', 'Isaac Newton', 'Marie Curie', 'Galileo Galilei'] },
  { q: 'Roughly how long does sunlight take to reach Earth?', a: ['8 minutes', '8 seconds', '8 hours', '1 minute'] },
  { q: 'How many teeth does an adult usually have, wisdom teeth included?', a: ['32', '28', '30', '36'] },
  { q: 'Which country invented paper?', a: ['China', 'Egypt', 'Greece', 'India'] },
  { q: 'What is the largest organ of the human body?', a: ['The skin', 'The liver', 'The brain', 'The lungs'] },
];

/** Questions for one mission, each once before any comes back. */
export function triviaBag(random: Random = Math.random): () => TriviaQuestion {
  return shuffleBag(TRIVIA, random);
}
