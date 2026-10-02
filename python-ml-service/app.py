from flask import Flask, request, jsonify
from flask_cors import CORS
import pdfplumber
import docx
import os
import re
import unicodedata

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = Flask(__name__)
CORS(app)


STOP_WORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'can', 'for', 'from',
    'has', 'have', 'in', 'is', 'it', 'of', 'on', 'or', 'our', 'role', 'that',
    'the', 'their', 'this', 'to', 'was', 'we', 'will', 'with', 'work', 'you',
    'your', 'job', 'required', 'requirements', 'experience', 'candidate',
    'ability', 'skills', 'skill', 'years', 'year', 'strong', 'good', 'must',
    'knowledge', 'understanding', 'including', 'such', 'using', 'etc', 'need',
    'needs', 'seeking', 'looking', 'responsibilities', 'preferred', 'join',
    'team', 'teams'
}


def normalize_text(value):
    """Normalize text for comparisons while preserving technical tokens."""
    value = unicodedata.normalize('NFKC', str(value or '')).lower()
    value = value.replace('c++', 'cplusplus').replace('c#', 'csharp')
    value = value.replace('.net', ' dotnet ')
    value = re.sub(r'(?<![a-z0-9])\.|\.(?![a-z0-9])', ' ', value)
    value = re.sub(r'[^a-z0-9+#.]+', ' ', value)
    return re.sub(r'\s+', ' ', value).strip()


def skill_list(value):
    """Accept comma, semicolon, pipe, or newline separated skill lists."""
    aliases = {
        'js': 'javascript', 'nodejs': 'node.js', 'node js': 'node.js',
        'ts': 'typescript', 'reactjs': 'react', 'react.js': 'react',
        'postgres': 'postgresql', 'postgres sql': 'postgresql',
        'c sharp': 'csharp', 'c plus plus': 'cplusplus',
        'k8s': 'kubernetes', 'amazon web services': 'aws',
        'google cloud platform': 'gcp', 'google cloud': 'gcp',
        'microsoft azure': 'azure'
    }
    if isinstance(value, list):
        parts = value
    else:
        parts = re.split(r'[,;|\n\r]+', str(value or ''))
    unique = {}
    for part in parts:
        display = re.sub(r'\s+', ' ', str(part)).strip()
        normalized = normalize_text(display)
        if normalized:
            normalized = aliases.get(normalized, normalized)
            unique.setdefault(normalized, display)
    return unique


def keyword_list(job_text):
    normalized = normalize_text(job_text)
    tokens = re.findall(r'[a-z0-9]+(?:[+#.]?[a-z0-9]+)*', normalized)
    return list(dict.fromkeys(
        token for token in tokens
        if len(token) > 1 and token not in STOP_WORDS and not token.isdigit()
    ))


# Week 3 - Resume text extraction
@app.route('/extract-resume-text', methods=['POST'])
def extract_resume_text():
    try:
        data = request.get_json(silent=True) or {}
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
            for table in doc.tables:
                for row in table.rows:
                    extracted_text += ' | '.join(cell.text for cell in row.cells) + "\n"

        else:
            return jsonify({
                'error': 'Unsupported file format. Only PDF and DOCX are supported.'
            }), 400

        extracted_text = extracted_text.strip()
        if not extracted_text:
            return jsonify({'error': 'No selectable text was found. For a scanned PDF, use a text-based PDF or DOCX.'}), 422
        return jsonify({'text': extracted_text})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - Job and candidate matching
@app.route('/match-score', methods=['POST'])
def match_score():
    try:
        data = request.get_json(silent=True) or {}

        resume_text = str(data.get('resume_text') or '').strip()
        job_text = str(data.get('job_text') or '').strip()

        if not resume_text or not job_text:
            return jsonify({'error': 'Add resume text and job details to compare wording.'}), 400

        vectorizer = TfidfVectorizer()
        try:
            vectors = vectorizer.fit_transform([resume_text, job_text])
            similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        except ValueError:
            similarity = 0
        score = round(similarity * 100, 2)

        return jsonify({
            'score': score,
            'score_type': 'resume_job_text_similarity',
            'score_note': 'Measures overlap in wording only. It does not assess qualifications or predict hiring success.'
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - ATS resume score
@app.route('/ats-score', methods=['POST'])
def ats_score():
    try:
        data = request.get_json(silent=True) or {}

        resume_text = str(data.get('resume_text') or '').strip()
        job_text = str(data.get('job_text') or '').strip()

        if not resume_text or not job_text:
            return jsonify({'error': 'Add resume text and job details to calculate an estimate.'}), 400

        normalized_resume = f' {normalize_text(resume_text)} '
        keywords = keyword_list(job_text)
        matched_keywords = [word for word in keywords if f' {word} ' in normalized_resume]
        missing_keywords = [word for word in keywords if word not in matched_keywords]
        keyword_score = (len(matched_keywords) / len(keywords) * 100) if keywords else 0

        section_patterns = {
            'experience': r'\b(experience|employment|work history|professional history)\b',
            'education': r'\b(education|academic background|qualifications)\b',
            'skills': r'\b(skills|technical skills|core competencies)\b'
        }
        sections_found = [
            name for name, pattern in section_patterns.items()
            if re.search(pattern, resume_text, re.IGNORECASE)
        ]
        sections_missing = [name for name in section_patterns if name not in sections_found]
        section_score = len(sections_found) / len(section_patterns) * 100
        final_score = round(keyword_score * 0.8 + section_score * 0.2, 1)

        suggestions = []
        if missing_keywords:
            suggestions.append('If these skills reflect your experience, describe them using the wording from the job post: ' + ', '.join(missing_keywords[:12]))
        if sections_missing:
            suggestions.append('Consider adding clearly labeled sections for: ' + ', '.join(sections_missing) + '.')
        if not keywords:
            suggestions.append('This job post has too little detail for a useful keyword comparison.')
        if not suggestions:
            suggestions.append('Your resume includes the detected job terms and standard sections. Review it for accuracy and readability.')

        return jsonify({
            'score': final_score,
            'score_type': 'resume_alignment_estimate',
            'score_note': 'A transparent keyword and section estimate. It is not an employer ATS result or a guarantee of selection.',
            'keyword_score': round(keyword_score, 1),
            'section_score': round(section_score, 1),
            'matched_keywords': matched_keywords,
            'missing_keywords': missing_keywords,
            'sections_found': sections_found,
            'sections_missing': sections_missing,
            'suggestions': suggestions
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Week 4 - Skill gap analysis
@app.route('/skill-gap', methods=['POST'])
def skill_gap():
    try:
        data = request.get_json(silent=True) or {}
        candidate_skills = skill_list(data.get('candidate_skills', ''))
        required_skills = skill_list(data.get('required_skills', ''))

        if not candidate_skills or not required_skills:
            return jsonify({'error': 'Provide your skills and the job skills to compare.'}), 400

        matched_keys = [key for key in required_skills if key in candidate_skills]
        missing_keys = [key for key in required_skills if key not in candidate_skills]
        matched_skills = [required_skills[key] for key in matched_keys]
        missing_skills = [required_skills[key] for key in missing_keys]
        coverage = round(len(matched_keys) / len(required_skills) * 100, 1)

        suggestion = (
            'All listed job skills are present in your profile.' if not missing_skills
            else 'Review the missing skills and add them to your profile only if they reflect experience you can support.'
        )

        return jsonify({
            'coverage': coverage,
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'suggestion': suggestion,
            'required_count': len(required_skills),
            'matched_count': len(matched_skills)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
