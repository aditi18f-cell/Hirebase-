from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import docx
import os
import re

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = Flask(__name__)
CORS(app)


# Week 3 - Resume text extraction
@app.route('/extract-resume-text', methods=['POST'])
def extract_resume_text():
    try:
        data = request.get_json()
        file_path = data.get('file_path')

        if not file_path:
            return jsonify({'error': 'No file path provided'}), 400

        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        file_extension = os.path.splitext(file_path)[1].lower()

        extracted_text = ""

        if file_extension == '.pdf':
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"

        elif file_extension == '.docx':
            doc = docx.Document(file_path)
            for para in doc.paragraphs:
                extracted_text += para.text + "\n"

        else:
            return jsonify({
                'error': 'Unsupported file format. Only PDF and DOCX are supported.'
            }), 400

        return jsonify({'text': extracted_text.strip()})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - Job and candidate matching
@app.route('/match-score', methods=['POST'])
def match_score():
    try:
        data = request.get_json()

        resume_text = data.get('resume_text', '')
        job_text = data.get('job_text', '')

        if not resume_text or not job_text:
            return jsonify({'error': 'resume_text and job_text are required'}), 400

        vectorizer = TfidfVectorizer()
        vectors = vectorizer.fit_transform([resume_text, job_text])

        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        score = round(similarity * 100, 2)

        return jsonify({
            'score': score
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - ATS resume score
@app.route('/ats-score', methods=['POST'])
def ats_score():
    try:
        data = request.get_json()

        resume_text = data.get('resume_text', '')
        job_text = data.get('job_text', '')

        if not resume_text or not job_text:
            return jsonify({'error': 'resume_text and job_text are required'}), 400

        resume_lower = resume_text.lower()
        job_lower = job_text.lower()

        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9+#.-]*\b', job_lower)

        common_words = {
            'the', 'and', 'for', 'with', 'from', 'this', 'that',
            'have', 'has', 'are', 'you', 'your', 'our', 'job',
            'role', 'work', 'will', 'can', 'should', 'required',
            'requirements', 'experience'
        }

        keywords = []

        for word in words:
            if word not in common_words and len(word) > 2:
                if word not in keywords:
                    keywords.append(word)

        matched_keywords = []
        missing_keywords = []

        for keyword in keywords:
            if keyword in resume_lower:
                matched_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)

        if len(keywords) > 0:
            keyword_score = (len(matched_keywords) / len(keywords)) * 100
        else:
            keyword_score = 0

        sections = ['experience', 'education', 'skills']
        found_sections = 0

        for section in sections:
            if section in resume_lower:
                found_sections += 1

        format_score = (found_sections / len(sections)) * 100

        final_score = (keyword_score * 0.8) + (format_score * 0.2)
        final_score = round(final_score, 2)

        suggestions = []

        if missing_keywords:
            suggestions.append(
                'Aap resume me ye keywords add kar sakte ho: '
                + ', '.join(missing_keywords)
            )

        if found_sections < 3:
            suggestions.append(
                'Resume me Experience, Education aur Skills sections rakhein.'
            )

        return jsonify({
            'score': final_score,
            'missing_keywords': missing_keywords,
            'suggestions': suggestions
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - Skill gap analysis
@app.route('/skill-gap', methods=['POST'])
def skill_gap():
    try:
        data = request.get_json()

        candidate_skills = data.get('candidate_skills', '')
        required_skills = data.get('required_skills', '')

        candidate_list = [
            skill.strip().lower()
            for skill in candidate_skills.split(',')
            if skill.strip()
        ]

        required_list = [
            skill.strip().lower()
            for skill in required_skills.split(',')
            if skill.strip()
        ]

        candidate_set = set(candidate_list)
        required_set = set(required_list)

        missing_set = required_set - candidate_set
        missing_skills = sorted(list(missing_set))

        if missing_skills:
            suggestion = (
                'Aap ye skills sikh sakte ho: '
                + ', '.join(missing_skills)
            )
        else:
            suggestion = 'Aapke paas job ke liye required skills hain.'

        return jsonify({
            'missing_skills': missing_skills,
            'suggestion': suggestion
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)