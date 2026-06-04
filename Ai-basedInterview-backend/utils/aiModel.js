const axios = require('axios');
require('dotenv').config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini';

// Interviewer personas keyed by Polly voiceId
// NOTE: All personas are calibrated for FRESHER / ENTRY-LEVEL interviews (0–2 yrs experience).
// They should assess fundamental understanding, not production-level depth.
const PERSONAS = {
  Matthew: {
    name: 'Matthew',
    style: 'experienced software engineer interviewing fresh graduates',
    traits: 'You are clear, structured, and fair. You test conceptual understanding and basic problem-solving. You do not expect production depth from freshers — you reward clear reasoning and honest attempts. You give encouraging but honest feedback.'
  },
  Brian: {
    name: 'Brian',
    style: 'approachable backend developer conducting a fresher interview',
    traits: 'You value clear thinking over jargon. You ask straightforward questions about fundamentals and basic patterns. You are friendly and direct. You appreciate when candidates reason through a problem even if they don\'t know the exact answer.'
  },
  Amy: {
    name: 'Amy',
    style: 'database instructor interviewing entry-level candidates',
    traits: 'You focus on core database concepts, basic query writing, and fundamental design principles. You are methodical and patient. You appreciate structured, logical answers even if they lack advanced depth.'
  },
  Raveena: {
    name: 'Raveena',
    style: 'warm HR interviewer assessing freshers for culture and potential',
    traits: 'You assess communication clarity, attitude, and growth mindset — not years of experience. You use the STAR method gently. You are encouraging, notice honesty and enthusiasm, and value candidates who show willingness to learn.'
  },
  Olivia: {
    name: 'Olivia',
    style: 'friendly full-stack developer mentoring and interviewing fresh talent',
    traits: 'You cover frontend and backend basics with equal friendliness. You care about clean thinking and understanding of core concepts. You are collaborative in tone. You appreciate candidates who can reason end-to-end even at a basic level.'
  },
  default: {
    name: 'the interviewer',
    style: 'professional interviewer conducting a fresher-level interview',
    traits: 'You are balanced, fair, and professional. You ask clear foundational questions and give honest, constructive feedback calibrated for entry-level candidates.'
  }
};

// Difficulty level instructions — all calibrated for FRESHERS (0–2 yrs).
// Think of these as stages within a junior interview, not as seniority levels.
const DIFFICULTY_PROMPTS = {
  easy:   'Ask basic definition and concept questions. Test whether the candidate knows what a term means, can give a simple example, and understands the "what". Assume zero real-world experience.',
  medium: 'Ask "how" and "why" questions about concepts. The candidate should be able to explain how something works, give a simple use-case, and reason through a straightforward scenario. Still no production depth expected.',
  hard:   'Ask slightly deeper questions: compare two approaches, spot a basic trade-off, or walk through a simple problem end-to-end. This is the ceiling for a fresher — do NOT ask system-design, architecture, or production-scale questions.'
};

const getPersona = (voiceId) => PERSONAS[voiceId] || PERSONAS.default;

/**
 * Generate the opening interview question/greeting.
 */
const generateResponse = async (voiceId, jobDescription, type, candidateName = 'Candidate') => {
  const persona = getPersona(voiceId);
  try {
    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are ${persona.name}, a ${persona.style} conducting an interview for the role of ${type}.
${persona.traits}
You should always begin by greeting the candidate warmly and asking for their self-introduction first.
Do not jump into technical or role-related questions in the first message.
Keep the tone conversational, concise, and natural. Avoid sounding robotic or scripted.
Do NOT invent or assume any information about the candidate.`
          },
          {
            role: 'user',
            content: `The candidate name is ${candidateName} and has applied for the following job:\n\n"${jobDescription}".\n\nStart the interview by greeting the candidate politely and asking them to introduce themselves.
Do not include any technical or role-specific questions at this point.
Begin your response with: "Hello, I am ${persona.name} and I will be your interviewer today."`
          }
        ],
        temperature: 0.4,
        max_tokens: 200
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('[AI] Error generating question:', error.response?.data || error.message);
    return 'Hello! Welcome to the interview. Could you please introduce yourself?';
  }
};

/**
 * Evaluate the candidate's answer and generate feedback + next question.
 * Includes persona, difficulty level, and recent conversation history for context.
 */
const evaluateAnswer = async (
  userAnswer,
  type,
  question,
  candidateName = 'Candidate',
  recentHistory = [],
  isLastQuestion = false,
  voiceId = 'Matthew',
  difficulty = 'easy'
) => {
  const persona = getPersona(voiceId);
  const difficultyInstructions = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.easy;

  try {
    let historyContext = '';
    if (recentHistory.length > 0) {
      historyContext = '\n\nRecent conversation context (do NOT repeat these questions):\n';
      recentHistory.forEach((h) => {
        historyContext += `Q: ${h.question}\nA: ${h.answer}\n`;
      });
    }

    let endingInstruction = '';
    if (isLastQuestion) {
      endingInstruction = `\n\nIMPORTANT: This is the LAST question. After giving feedback on the answer, conclude the interview naturally.
Say something like "Thank you for your time, ${candidateName}. That concludes our interview today. We'll prepare your evaluation report shortly."
Do NOT ask another question. Include "Thank you for your time" in your response to signal the end.`;
    }

    const response = await axios.post(
      BASE_URL,
      {
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are ${persona.name}, a ${persona.style}, conducting a live ${type} interview with ${candidateName}.
${persona.traits}

CANDIDATE LEVEL: FRESHER / ENTRY-LEVEL (0–2 years experience).
Calibrate ALL feedback and questions to this level. Do NOT expect production depth, advanced architecture knowledge, or years of hands-on experience. Reward correct conceptual understanding, honest reasoning, and clear communication.

DIFFICULTY LEVEL (${difficulty.toUpperCase()}): ${difficultyInstructions}

RULES:
1. Give feedback in 1-2 SHORT sentences MAX, then ask ONE question.
2. If candidate asks to repeat: return ONLY the original question.
3. If candidate asks to explain or clarify: explain the concept simply in 1-2 sentences, then ASK THE EXACT SAME QUESTION AGAIN.
4. "I don't know" → 1-line feedback + "Next question:" [question]
5. Vague answer → brief feedback + "Follow-up:" [question]
6. Good answer → 1-sentence acknowledgment + "Next question:" [question]
7. NEVER use both "Follow-up:" and "Next question:" — pick one.
8. Never end the interview unless instructed.
9. Questions must be relevant to: ${type}. Keep them appropriate for a fresher.
10. Do NOT repeat questions from history.
11. Do NOT invent info the candidate didn't say.
12. Match your tone and question depth to the difficulty level above.${endingInstruction}

KEEP YOUR TOTAL RESPONSE UNDER 3 SENTENCES.`.trim()
          },
          {
            role: 'user',
            content: `${historyContext}

You asked: "${question}"

Candidate said: "${userAnswer}"

Now behave like a real interviewer having a voice conversation.`.trim()
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const fullText = response.data.choices[0].message.content.trim();
    console.log('[AI] Raw response:', fullText);

    const isRepeat = fullText.trim() === question.trim();

    const isEnding = isLastQuestion && /thank you for your time/i.test(fullText)
      && /(concludes|goodbye|good bye|evaluation|report|all the best)/i.test(fullText);

    if (isRepeat) {
      return { feedback: question, nextQuestion: null, followUp: null, isRepeat: true, isEnding: false };
    }

    if (isEnding) {
      return { feedback: fullText, nextQuestion: null, followUp: null, isRepeat: false, isEnding: true };
    }

    let feedback = fullText;
    let followUp = null;
    let nextQuestion = null;

    if (/Follow-up:/i.test(fullText)) {
      const [fb, fq] = fullText.split(/Follow-up:/i);
      feedback = fb.trim();
      followUp = fq.trim();
    } else if (/Next question:/i.test(fullText)) {
      const [fb, nq] = fullText.split(/Next question:/i);
      feedback = fb.trim();
      nextQuestion = nq.trim();
    } else {
      const sentences = fullText.split(/(?<=[.!?])\s+/);
      const questionSentences = [];
      const feedbackSentences = [];

      for (const s of sentences) {
        if (s.trim().endsWith('?')) {
          questionSentences.push(s.trim());
        } else {
          feedbackSentences.push(s.trim());
        }
      }

      if (questionSentences.length > 0) {
        nextQuestion = questionSentences[questionSentences.length - 1];
        feedback = feedbackSentences.join(' ').trim() || feedback;
      }
    }

    return { feedback, nextQuestion, followUp, isRepeat: false, isEnding: false };
  } catch (error) {
    console.error('[AI] Error evaluating answer:', error.response?.data || error.message);
    return {
      feedback: 'I appreciate your response.',
      nextQuestion: 'Can you tell me more about your experience with this topic?',
      followUp: null,
      isRepeat: false,
      isEnding: false
    };
  }
};

/**
 * Generate the final interview evaluation report with per-question breakdown.
 */
const generateFinalFeedback = async (type, candidateName = 'Candidate', history = []) => {
  const makeRequest = async (attempt = 1) => {
    try {
      const response = await axios.post(
        BASE_URL,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a fair, experienced interviewer providing a final evaluation of a FRESHER / ENTRY-LEVEL candidate (0–2 years experience).
Respond ONLY in valid JSON format. Do not include explanations, extra text, markdown code fences, or anything outside the JSON.

IMPORTANT CONTEXT: This is a fresher interview. The scoring rubric is calibrated for entry-level candidates.
Do NOT penalise candidates for lacking production experience, advanced architecture knowledge, or years of hands-on depth.
Reward correct conceptual understanding, logical reasoning, clear communication, and honest attempts.

OVERALL SCORING RUBRIC (fresher-calibrated):
- 85-100: Outstanding fresher — strong fundamentals, clear articulation, went beyond basics, excellent communication
- 70-84: Strong fresher — correct on most concepts, minor gaps, communicates well, shows good potential
- 55-69: Good fresher — understands core concepts, some gaps in depth or clarity, decent communication
- 40-54: Average fresher — basic understanding shown, answers are surface-level but directionally correct, needs development
- 25-39: Below Average — significant conceptual gaps, struggled to articulate even basic ideas
- 0-24: Poor — could not answer most questions, did not demonstrate foundational knowledge

CRITICAL SCORING CONSISTENCY RULES (fresher context):
- The score MUST match the tone of your written feedback.
- Surface-level but correct answers from a fresher are EXPECTED — they should score 45-60, NOT lower.
- A fresher who answers most questions correctly but without deep detail should score 55-70.
- If most soft skills are "Poor": score MUST be 0-35
- If most soft skills are "Average": score MUST be 35-55
- If most soft skills are "Good" but there are knowledge gaps: score MUST be 50-68
- If most soft skills are "Good" and answers are mostly correct: score MUST be 65-80
- If all soft skills are "Good" with strong conceptual answers: score can be 80+
- If candidate said "I don't know" to MOST (>60%) questions: score should NOT exceed 35
- If candidate gave partial/surface answers to most questions: score range is 40-60
- Never unfairly penalise a fresher for not knowing advanced topics

PER-QUESTION SCORING RUBRIC (fresher-calibrated):
- 80-100: Correct concept, well explained, good example or reasoning — excellent for a fresher
- 60-79: Correct concept, explained adequately, minor gaps — good for a fresher
- 40-59: Partially correct or surface-level but on the right track — acceptable for a fresher
- 20-39: Mostly incorrect or very vague with little substance shown
- 0-19: Could not answer or completely off-track

EVALUATION RULES:
- Only evaluate based on the Q&A transcript provided
- Do NOT assume skills or knowledge not demonstrated
- Be honest and constructive, not harsh — this is a fresher, not a senior engineer
- Base soft skill ratings on HOW the candidate communicated, not on technical depth
- Provide specific, actionable suggestions a fresher can actually act on

The JSON MUST have exactly this structure:
{
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1", "specific weakness 2"],
  "soft_skills": {
    "communication": "Good / Average / Poor — with 1-line reason",
    "presentation": "Good / Average / Poor — with 1-line reason",
    "confidence": "Good / Average / Poor — with 1-line reason"
  },
  "overall_feedback": "2-3 sentence summary of interview performance, calibrated for a fresher candidate",
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
  "score": <number 0-100>,
  "questionBreakdown": [
    { "questionNumber": 1, "topic": "<short topic label>", "score": <0-100>, "observation": "<1-sentence note>" },
    ...one entry per answered question...
  ]
}`.trim()
            },
            {
              role: 'user',
              content: `Interview type: ${type}
Candidate: ${candidateName}
Candidate level: FRESHER / ENTRY-LEVEL (0–2 years experience) — apply the fresher-calibrated rubric.

Full Q&A transcript:
${history.map((h, i) =>
  `Q${i + 1}: ${h.question}\nA: ${h.answer}\nEmotion detected: ${h.emotion || 'neutral'}\n`
).join('\n')}

Now provide the final evaluation JSON for ${candidateName}. Remember to use the FRESHER-CALIBRATED scoring rubric.`.trim()
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      let raw = response.data.choices[0].message.content.trim();
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      const parsed = JSON.parse(raw);

      if (!parsed.strengths || !parsed.weaknesses || !parsed.overall_feedback || typeof parsed.score !== 'number') {
        throw new Error('Missing required fields in response');
      }

      parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)));

      // Normalise questionBreakdown entries
      if (Array.isArray(parsed.questionBreakdown)) {
        parsed.questionBreakdown = parsed.questionBreakdown.map((q) => ({
          questionNumber: q.questionNumber || 0,
          topic: q.topic || 'General',
          score: Math.max(0, Math.min(100, Math.round(q.score || 0))),
          observation: q.observation || ''
        }));
      } else {
        parsed.questionBreakdown = [];
      }

      return parsed;
    } catch (err) {
      console.error(`[AI] Attempt ${attempt} failed for final feedback:`, err.message);
      if (attempt < 2) {
        console.log('[AI] Retrying final feedback generation...');
        return makeRequest(attempt + 1);
      }
      return {
        strengths: ['Completed the interview'],
        weaknesses: ['Unable to generate detailed evaluation'],
        soft_skills: {
          communication: 'Average — evaluation could not be completed fully',
          presentation: 'Average — evaluation could not be completed fully',
          confidence: 'Average — evaluation could not be completed fully'
        },
        overall_feedback: 'The interview was completed but the detailed evaluation could not be generated. Please try again.',
        suggestions: ['Practice more mock interviews', 'Review core concepts for the role'],
        score: 50,
        questionBreakdown: []
      };
    }
  };

  return makeRequest();
};

module.exports = { generateResponse, evaluateAnswer, generateFinalFeedback };
