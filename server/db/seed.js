import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb, initializeDatabase } from './database.js';

async function seed() {
  try {
    const db = await initializeDatabase();

    console.log('Starting seeding...');

    // 1. Create demo student user
    const checkUser = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@studybuddy.com');
    let userId;

    if (!checkUser) {
      userId = crypto.randomUUID();
      const hash = bcrypt.hashSync('password123', 10);
      db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(userId, 'Demo Student', 'demo@studybuddy.com', hash, 'student');
      console.log('Demo student created: demo@studybuddy.com / password123');
    } else {
      userId = checkUser.id;
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('student', userId);
      console.log('Demo student already exists, role set to student.');
    }

    // 2. Create admin user
    const checkAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@studybuddy.com');
    if (!checkAdmin) {
      const adminId = crypto.randomUUID();
      const adminHash = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(adminId, 'System Admin', 'admin@studybuddy.com', adminHash, 'admin');
      console.log('Admin user created: admin@studybuddy.com / admin123');
    } else {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', checkAdmin.id);
      console.log('Admin user already exists, role verified.');
    }

    // 2. Check if demo questions already exist
    const existingDemo = db.prepare('SELECT COUNT(*) as count FROM questions WHERE is_demo = 1').get();
    if (existingDemo && existingDemo.count > 0) {
      console.log(`${existingDemo.count} demo questions already exist. Skipping.`);
      return;
    }

    // 3. Insert demo questions
    const questions = [
      // English (5 questions)
      { text: 'Choose the correct synonym for "ABUNDANT":', options: ['Scarce', 'Plentiful', 'Rare', 'Empty'], correct: 1, explanation: '"Plentiful" means existing in great quantities; abundant.', subject: 'English', topic: 'Vocabulary', difficulty: 'Easy' },
      { text: 'Identify the grammatically correct sentence:', options: ['He don\'t know nothing.', 'He doesn\'t know anything.', 'He don\'t knows anything.', 'He doesn\'t knows nothing.'], correct: 1, explanation: '"Doesn\'t" is correct for third person singular, and "anything" is used in negative sentences.', subject: 'English', topic: 'Grammar', difficulty: 'Medium' },
      { text: 'What is the antonym of "DILIGENT"?', options: ['Hardworking', 'Lazy', 'Careful', 'Active'], correct: 1, explanation: '"Diligent" means hardworking and careful. "Lazy" is the opposite.', subject: 'English', topic: 'Vocabulary', difficulty: 'Easy' },
      { text: 'Which word is spelled correctly?', options: ['Accommodate', 'Accomodate', 'Acommodate', 'Accomadate'], correct: 0, explanation: '"Accommodate" has two c\'s and two m\'s.', subject: 'English', topic: 'Spelling', difficulty: 'Medium' },
      { text: 'Fill in the blank: "She has been living here ___ 2010."', options: ['for', 'since', 'from', 'in'], correct: 1, explanation: '"Since" is used for a specific point in time when the action started.', subject: 'English', topic: 'Grammar', difficulty: 'Easy' },

      // Reasoning (5 questions)
      { text: 'If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?', options: ['Brother', 'Sister', 'Nephew', 'Cannot be determined'], correct: 3, explanation: 'The gender of D is not given, so the relation cannot be determined.', subject: 'Reasoning', topic: 'Blood Relations', difficulty: 'Hard' },
      { text: 'Find the missing number: 2, 6, 12, 20, 30, ?', options: ['40', '42', '44', '48'], correct: 1, explanation: 'Pattern: +4, +6, +8, +10, +12. So 30 + 12 = 42.', subject: 'Reasoning', topic: 'Number Series', difficulty: 'Medium' },
      { text: 'Which word does NOT belong with the others?', options: ['Apple', 'Banana', 'Carrot', 'Mango'], correct: 2, explanation: 'Carrot is a vegetable; the others are fruits.', subject: 'Reasoning', topic: 'Classification', difficulty: 'Easy' },
      { text: 'Pointing to a man, a woman said "His mother is the only daughter of my mother." How is the woman related to the man?', options: ['Mother', 'Grandmother', 'Sister', 'Daughter'], correct: 0, explanation: 'The only daughter of my mother = the woman herself. So she is the man\'s mother.', subject: 'Reasoning', topic: 'Blood Relations', difficulty: 'Hard' },
      { text: 'All roses are flowers. Some flowers are red. Conclusion: Some roses are red. Is this valid?', options: ['Yes', 'No', 'Maybe', 'Insufficient data'], correct: 1, explanation: 'This is an invalid syllogism. "Some flowers are red" does not mean the red flowers are roses.', subject: 'Reasoning', topic: 'Syllogism', difficulty: 'Medium' },

      // Quantitative Aptitude (5 questions)
      { text: 'What is 15% of 80?', options: ['10', '12', '14', '15'], correct: 1, explanation: '15/100 × 80 = 12', subject: 'Quantitative Aptitude', topic: 'Percentages', difficulty: 'Easy' },
      { text: 'Solve for x: 3x - 5 = 16', options: ['5', '6', '7', '8'], correct: 2, explanation: '3x = 21, so x = 7', subject: 'Quantitative Aptitude', topic: 'Algebra', difficulty: 'Easy' },
      { text: 'The sum of angles in a triangle is:', options: ['90°', '180°', '270°', '360°'], correct: 1, explanation: 'The sum of interior angles of a triangle is always 180 degrees.', subject: 'Quantitative Aptitude', topic: 'Geometry', difficulty: 'Easy' },
      { text: 'A train 150m long passes a pole in 10 seconds. What is its speed in km/hr?', options: ['45', '54', '60', '72'], correct: 1, explanation: 'Speed = 150/10 = 15 m/s = 15 × 18/5 = 54 km/hr', subject: 'Quantitative Aptitude', topic: 'Speed & Distance', difficulty: 'Medium' },
      { text: 'The average of first 50 natural numbers is:', options: ['25', '25.5', '26', '26.5'], correct: 1, explanation: 'Average = (n+1)/2 = 51/2 = 25.5', subject: 'Quantitative Aptitude', topic: 'Averages', difficulty: 'Medium' },

      // General Awareness (5 questions)
      { text: 'Who was the first President of India?', options: ['Jawaharlal Nehru', 'Dr. Rajendra Prasad', 'Dr. B.R. Ambedkar', 'Sardar Patel'], correct: 1, explanation: 'Dr. Rajendra Prasad served as the first President of India (1950-1962).', subject: 'General Awareness', topic: 'Indian History', difficulty: 'Easy' },
      { text: 'What is the capital of Australia?', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], correct: 2, explanation: 'Canberra is the capital city of Australia.', subject: 'General Awareness', topic: 'Geography', difficulty: 'Medium' },
      { text: 'Which article of the Indian Constitution abolishes untouchability?', options: ['Article 14', 'Article 15', 'Article 16', 'Article 17'], correct: 3, explanation: 'Article 17 abolishes untouchability and forbids its practice.', subject: 'General Awareness', topic: 'Indian Polity', difficulty: 'Hard' },
      { text: 'What is the chemical symbol for Gold?', options: ['Go', 'Ag', 'Au', 'Gd'], correct: 2, explanation: 'Au comes from the Latin word "Aurum".', subject: 'General Awareness', topic: 'Science', difficulty: 'Easy' },
      { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1, explanation: 'Mars appears red due to iron oxide on its surface.', subject: 'General Awareness', topic: 'Science', difficulty: 'Easy' },

      // Computer (5 questions)
      { text: 'What does CPU stand for?', options: ['Central Process Unit', 'Computer Personal Unit', 'Central Processing Unit', 'Central Processor Unit'], correct: 2, explanation: 'CPU = Central Processing Unit, the brain of a computer.', subject: 'Computer', topic: 'Basics', difficulty: 'Easy' },
      { text: 'Which of these is NOT an operating system?', options: ['Windows', 'Linux', 'Oracle', 'macOS'], correct: 2, explanation: 'Oracle is a database management system, not an OS.', subject: 'Computer', topic: 'Basics', difficulty: 'Medium' },
      { text: 'What is the full form of HTTP?', options: ['HyperText Transfer Protocol', 'HyperText Transmission Protocol', 'HyperTransfer Text Protocol', 'HyperLink Transfer Protocol'], correct: 0, explanation: 'HTTP = HyperText Transfer Protocol.', subject: 'Computer', topic: 'Networking', difficulty: 'Easy' },
      { text: 'Which language is known as the "mother of all languages"?', options: ['Java', 'C', 'Python', 'Assembly'], correct: 1, explanation: 'C is often called the mother of all languages; many modern languages derive from it.', subject: 'Computer', topic: 'Programming', difficulty: 'Medium' },
      { text: '1 Byte is equal to:', options: ['4 bits', '8 bits', '16 bits', '32 bits'], correct: 1, explanation: 'A byte consists of 8 bits.', subject: 'Computer', topic: 'Basics', difficulty: 'Easy' },
    ];

    const insertSql = `INSERT INTO questions (id, user_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, subject, topic, difficulty, is_demo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`;

    let insertedCount = 0;
    for (const q of questions) {
      db.prepare(insertSql).run(
        crypto.randomUUID(),
        userId,
        q.text,
        q.options[0],
        q.options[1],
        q.options[2],
        q.options[3],
        q.correct,
        q.explanation,
        q.subject,
        q.topic,
        q.difficulty
      );
      insertedCount++;
    }

    console.log(`Successfully seeded ${insertedCount} demo questions.`);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
