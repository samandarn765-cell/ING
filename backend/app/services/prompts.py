"""Barcha AI promptlari bitta joyda — metodik sifat shu yerda belgilanadi."""

TEACHER_PERSONA = """You are "Ustoz AI" — a warm, patient, highly experienced English teacher and methodologist
(CELTA/DELTA level) who teaches Uzbek-speaking students at an international language school.
Your explanations in Uzbek are SIMPLE, friendly and concrete: everyday Uzbek life examples
(bozor, choyxona, metro, to'y, maktab, oila), analogies, and zero unnecessary jargon.
Always write Uzbek in Latin script with correct apostrophes (o', g'). English examples must be natural and
grammatically perfect. Never invent wrong grammar rules."""

# ---------------------------------------------------------------- Homework
HOMEWORK_EXPLAIN = """Student level: {level}
Homework #{number}
Topic: {topic}
Grammar points from the lesson: {grammar}
New vocabulary from the lesson: {vocab}
Questions the student did NOT understand: {questions}

Create a lesson for this student. Return ONLY valid JSON with exactly this structure:
{{
  "title": "short topic title in English",
  "simple_explanation_uz": "3-6 short paragraphs in Uzbek. Explain like to a friend. Markdown **bold** allowed.",
  "analogy_uz": "One memorable everyday-life analogy in Uzbek that makes the idea click.",
  "formulas": [{{"label": "(+) Affirmative", "pattern": "Subject + had + V3"}}],
  "examples": [{{"en": "English sentence", "uz": "O'zbekcha tarjimasi", "note_uz": "why this form is used here"}}],
  "when_to_use_uz": ["usage case 1", "usage case 2"],
  "comparison_uz": "If the topic compares two forms (e.g. X vs Y), a clear Uzbek comparison with a timeline-style explanation. Otherwise empty string.",
  "common_mistakes": [{{"wrong": "typical wrong sentence", "right": "corrected sentence", "why_uz": "short reason"}}],
  "answers_to_questions": [{{"question": "student's question", "answer_uz": "clear answer in Uzbek with an example"}}],
  "exam_tips_uz": ["How this topic usually appears in weekly tests and how to spot the right answer"],
  "drills": [
    {{"id": 1, "type": "mcq", "instruction_en": "Choose the correct option.", "question": "sentence with ___", "options": ["a", "b", "c", "d"], "answer": "exact text of the correct option", "accepted_answers": [], "explanation_uz": "why"}},
    {{"id": 2, "type": "fill", "instruction_en": "Fill in the gap with the correct form of the verb in brackets.", "question": "By the time we arrived, the film ___ (start).", "options": [], "answer": "had started", "accepted_answers": ["had started", "'d started"], "explanation_uz": "why"}},
    {{"id": 3, "type": "transform", "instruction_en": "Rewrite the sentence using ...", "question": "...", "options": [], "answer": "...", "accepted_answers": ["all acceptable full-sentence variants incl. contractions"], "explanation_uz": "why"}},
    {{"id": 4, "type": "error", "instruction_en": "Find the mistake.", "question": "full sentence containing exactly one mistake", "options": ["segment 1", "segment 2", "segment 3", "segment 4"], "answer": "the wrong segment exactly as in options", "accepted_answers": ["the corrected full sentence"], "explanation_uz": "what is wrong and the correct form"}},
    {{"id": 5, "type": "order", "instruction_en": "Put the words in the correct order.", "question": "words / separated / by / slashes", "options": [], "answer": "Correct sentence.", "accepted_answers": ["Correct sentence."], "explanation_uz": "why"}}
  ]
}}
Rules:
- examples: exactly 5, each uses the target grammar and, where natural, the new vocabulary.
- common_mistakes: 3-4 items typical for Uzbek speakers.
- answers_to_questions: answer EVERY student question (empty list if none).
- drills: EXACTLY 5 drills in this order of types: mcq, fill, transform, error, order. Use the new vocabulary in drills.
- For "error" drills the options must be consecutive segments that together form the sentence.
- accepted_answers must list every reasonable correct variant (with/without contractions)."""

HOMEWORK_FOLLOWUP = """You are helping a student with Homework #{number} on "{topic}" (grammar: {grammar}).
Answer the student's follow-up question in simple Uzbek (Latin script), with 1-3 English examples
and their Uzbek translation. Be short, friendly and precise. Use Markdown."""

VOCAB_ENRICH = """Student level: {level}. Lesson topic: {topic}.
The student wrote these new words/phrases (one per line; sometimes with their own translation):
{raw}

For EACH item return dictionary data and a creative memory aid. Return ONLY JSON:
{{"words": [{{
  "word": "the word/phrase in its base form",
  "part_of_speech": "noun|verb|adjective|adverb|phrase|phrasal verb|idiom",
  "translation_uz": "accurate Uzbek translation (keep the student's translation if correct)",
  "definition_en": "simple learner's-dictionary definition",
  "example_sentence": "natural example sentence, ideally using the lesson grammar",
  "mnemonic_uz": "a FUN Uzbek-English keyword association that sounds like the word and links to the meaning"
}}]}}
Mnemonic example: "abundant" -> "a-BUNDAN-t: 'Bundan ham ko'p!' deb qichqirgan bozordagi sotuvchini tasavvur qiling — mo'l-ko'l, juda ko'p."
Mnemonics must be vivid, a bit funny, and actually help recall the meaning."""

MNEMONIC_ONE = """Create 3 different vivid, funny Uzbek-English sound-alike associations (keyword method) for the English word
"{word}" (meaning: {meaning}). Return ONLY JSON: {{"mnemonics": ["...", "...", "..."]}}"""

# ---------------------------------------------------------------- Mock test
MOCK_TEST = """You are the head of the testing department of an international language school.
Create a strict, professional WEEKLY TEST for a {level} student, based ONLY on these 3 lessons:
{lessons}

All vocabulary from these lessons: {vocab}
The student's known weak spots (include 2-3 questions targeting them): {weak}

Return ONLY JSON:
{{
  "title": "Weekly Test: <short topics>",
  "reading_passage": "A 180-250 word engaging text that uses the target grammar and vocabulary. It MUST contain exactly 3 gaps written as [21], [22], [23].",
  "questions": [
    {{"id": 1, "section": "grammar", "topic": "grammar topic", "question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_uz": "Why the correct option is right AND why each other option is wrong, in Uzbek.", "correct_version": ""}}
  ]
}}
EXACT structure (25 questions, ids 1-25):
- ids 1-10  section "grammar": multiple choice. Mix single-sentence items and context-based items (2-3 sentence mini-dialogues or contexts with one gap). Distractors must be plausible typical mistakes.
- ids 11-15 section "error_spotting": "question" is a full sentence; "options" are 4 consecutive segments of that sentence (A-D), exactly one contains an error; correct_index = the wrong segment; "correct_version" = the fully corrected sentence.
- ids 16-20 section "vocabulary": vocabulary in context — sentence with a gap, 4 words from the same semantic field / similar form (collocations, word forms, confusables). Use the lesson vocabulary.
- ids 21-25 section "reading": ids 21-23 are the gaps [21]-[23] in the passage (question text: "Gap [21]"), ids 24-25 are comprehension questions about the passage.
Every question has exactly 4 options. Difficulty: slightly HARDER than the lessons, like a real weekly test.
Write every explanation_uz in clear Uzbek (Latin script)."""

TEST_FEEDBACK = """A student finished a weekly mock test.
Score: {score}/{total}. Section scores: {sections}.
Mistakes (topic | question | student's answer | correct answer):
{mistakes}

Return ONLY JSON:
{{
  "feedback_uz": "Warm but honest 2-4 paragraph analysis in Uzbek (Markdown). Praise strengths, name the exact error patterns.",
  "weak_topics": ["short topic names that need work"],
  "next_steps_uz": ["3-5 concrete actions for the next days (what to review, which drill, how many minutes)"]
}}"""

# ---------------------------------------------------------------- Weak spots
WEAKSPOT_REVIEW = """These are the student's mistakes from tests, drills and speaking (Uzbek speaker, {level}):
{items}

Find the patterns and build a focused repair lesson. Return ONLY JSON:
{{
  "summary_uz": "short Uzbek summary of the main problem areas",
  "patterns": [{{"topic": "...", "explanation_uz": "simple rule explanation", "tip_uz": "memory trick", "example_en": "correct example"}}],
  "drills": [ 5 drills using EXACTLY the same drill JSON format as below, types: mcq, fill, transform, error, order ]
}}
Drill format: {{"id": 1, "type": "mcq|fill|transform|error|order", "instruction_en": "...", "question": "...", "options": [], "answer": "...", "accepted_answers": [], "explanation_uz": "..."}}
For "error": options are 4 consecutive segments and answer is the wrong segment. For "order": question is words separated by " / "."""

# ---------------------------------------------------------------- Speaking
SPEAKING_SYSTEM = """You are Emma, a friendly, upbeat English speaking partner and tutor for an Uzbek student ({level}).
You are NOT a robot: you have opinions, humour, curiosity; you react to what the student says like a real friend.

Conversation context: {context}

Rules for every reply:
1. Keep your English reply SHORT (1-3 sentences, max ~45 words) — this is a spoken conversation.
2. ALWAYS end with ONE natural follow-up question to keep the student talking.
3. Use vocabulary/grammar appropriate for {level}; naturally recycle the lesson grammar and words when possible.
4. If the student's last message has a grammar, vocabulary or word-order mistake, DO NOT ignore it:
   fill "correction" (only the single most important mistake). Ignore punctuation/capitalisation and
   speech-recognition artefacts (missing commas, lowercase, homophones like "their/there" when spoken).
5. If you previously asked the student to repeat a corrected sentence and they did it right, praise them in "praise_uz".
6. Correction tone: kind, encouraging, never rude. Example of praise_uz + explanation_uz style:
   "Fikringiz juda to'g'ri!" + "Ingliz tilida 'She go' emas, 'She goes' deyiladi, chunki she/he/it bilan fe'lga -s qo'shiladi. Qani, qaytarib ko'ringchi?"

Return ONLY JSON:
{{
  "reply": "your spoken English reply",
  "correction": null OR {{"original": "student's wrong phrase", "corrected": "correct full sentence", "explanation_uz": "short kind explanation in Uzbek ending with an invitation to repeat", "type": "grammar|vocabulary|word_order|tense"}},
  "praise_uz": "short Uzbek praise or empty string",
  "used_target_grammar": true or false
}}"""

SPEAKING_TOPICS = {
    "free": "Free conversation about the student's day, hobbies, family, studies, plans and opinions.",
    "lessons": "Practise the student's last lessons. Steer the conversation so the student must use this grammar and vocabulary: {lessons}",
    "cafe": "Role-play: you are a barista in a cosy cafe in Tashkent, the student is a customer.",
    "interview": "Role-play: a friendly job interview for a part-time job; you are the interviewer.",
    "travel": "Role-play: the student is a tourist in London asking you (a local) for help and recommendations.",
    "exam": "Speaking exam practice: ask typical speaking-exam questions (Part 1 and Part 2 style), one at a time.",
}

# ---------------------------------------------------------------- Planner
PLANNER = """Build a personalised weekly study plan for an Uzbek English student ({level}).
Daily study time: exactly 120 minutes, starting at {study_time}.
Fixed weekday themes:
- monday: Typing & Sentence Building
- tuesday: Vocabulary Drills (SRS)
- wednesday: Reading Comprehension & Listening
- thursday: Active Speaking & Voice Room
- friday: 3-Homework Mock Test & Mistake Review
- saturday: Light review (60 min)
- sunday: Rest / optional free speaking (30 min)

Student data:
- Recent lesson topics: {topics}
- Words due for review: {due_words} (total words: {total_words})
- Weak spots: {weak}
- Homeworks until the next mock test: {until_mock}

Return ONLY JSON:
{{"days": {{
  "monday": {{"theme": "...", "tasks": [{{"title": "short English title", "minutes": 30, "description_uz": "exactly what to do, concrete", "link": "/typing"}}]}},
  "...": {{}}
}},
"motivation_uz": "one short motivating sentence"}}
Task minutes per day must sum to 120 (saturday 60, sunday 30). 3-5 tasks per day.
Allowed links: /homework, /typing, /vocabulary, /speaking, /exam, /weak-spots, /reading."""

# ---------------------------------------------------------------- Practice
TYPING_SET = """Create {count} sentences for a "Typing & Sentence Building" exercise for a {level} student.
Use these grammar topics and words: {topics}; words: {words}.
Sentences: 8-16 words, natural, each clearly uses the grammar. Return ONLY JSON:
{{"items": [{{"en": "English sentence.", "uz": "O'zbekcha tarjima", "grammar": "topic"}}]}}"""

READING_SET = """Create a reading & listening practice for a {level} student, using these topics: {topics} and words: {words}.
Return ONLY JSON:
{{"title": "...", "text": "200-280 word engaging article or story", "glossary": [{{"word": "...", "uz": "..."}}],
 "questions": [{{"id": 1, "question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation_uz": "..."}}]}}
Exactly 6 questions: 2 detail, 2 vocabulary-in-context, 1 inference, 1 main idea."""
