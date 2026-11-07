import unittest
from unittest.mock import patch

from app import app, canonical_skill, contains_skill


class ResumeAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.model_patch = patch('app.get_sentence_model', return_value=None)
        self.model_patch.start()
        self.addCleanup(self.model_patch.stop)

    def test_versioned_web_skills_match_base_skills(self):
        self.assertEqual(canonical_skill('CSS3'), 'css')
        self.assertEqual(canonical_skill('HTML5'), 'html')
        self.assertTrue(contains_skill('Built responsive pages with HTML and CSS.', 'HTML5'))
        self.assertTrue(contains_skill('Built responsive pages with HTML5 and CSS3.', 'CSS'))

    def test_ats_response_includes_dimensions_and_role_specific_advice(self):
        response = self.client.post('/ats-score', json={
            'resume_text': (
                'SUMMARY\nSoftware developer.\nSKILLS\nHTML, CSS, Java, Python.\n'
                'EXPERIENCE\nBuilt a site used by 400 users and improved speed by 20%.\n'
                'EDUCATION\nB.Tech Computer Science.\nPROJECTS\nPortfolio website.'
            ),
            'job_text': 'Frontend developer. Build accessible web apps using HTML5, CSS3, JavaScript and React.',
            'required_skills': 'HTML5, CSS3, JavaScript, React'
        })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertGreaterEqual(result['score'], 0)
        self.assertLessEqual(result['score'], 100)
        self.assertEqual(result['matched_skills'], ['HTML5', 'CSS3'])
        self.assertEqual(set(result['missing_skills']), {'JavaScript', 'React'})
        self.assertIn('text_similarity', result['dimensions'])
        self.assertIsNone(result['dimensions']['semantic_similarity'])
        self.assertIn('quantified_lines', result['signals'])
        self.assertTrue(result['suggestions'])
        self.assertTrue(all(isinstance(item, dict) for item in result['suggestions']))

    def test_ats_shows_exact_resume_evidence_and_keeps_missing_skills_explicit(self):
        response = self.client.post('/ats-score', json={
            'resume_text': 'Built responsive web interfaces for 400 users.\nSkills: HTML and CSS.',
            'job_text': 'Develop modern frontend interfaces for customers using HTML5, CSS3, JavaScript and React.',
            'required_skills': 'HTML5, CSS3, JavaScript, React'
        })

        self.assertEqual(response.status_code, 200)
        evidence = response.get_json()['requirements_evidence']
        by_requirement = {item['requirement']: item for item in evidence}
        self.assertEqual(by_requirement['HTML5']['status'], 'matched')
        self.assertTrue(any('HTML' in excerpt for excerpt in by_requirement['HTML5']['resume_evidence']))
        self.assertEqual(by_requirement['JavaScript']['status'], 'missing')
        self.assertEqual(by_requirement['JavaScript']['resume_evidence'], [])

    def test_ats_reports_preferred_skills_separately_from_required_score(self):
        response = self.client.post('/ats-score', json={
            'resume_text': 'Skills: Java and Docker.',
            'job_text': 'Build services with Java. Docker is preferred.',
            'required_skills': 'Java',
            'preferred_skills': 'Docker, Kubernetes'
        })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result['matched_skills'], ['Java'])
        self.assertEqual(result['matched_preferred_skills'], ['Docker'])
        self.assertEqual(result['missing_preferred_skills'], ['Kubernetes'])
        self.assertEqual(result['dimensions']['skill_coverage'], 100.0)
        self.assertEqual(result['preferred_evidence'][0]['status'], 'matched')

    def test_semantic_match_shows_source_phrases_but_does_not_claim_exact_skill(self):
        class DeterministicSentenceModel:
            def encode(self, sentences, **kwargs):
                return [[1.0, 0.0] for _ in sentences]

        with patch('app.get_sentence_model', return_value=DeterministicSentenceModel()):
            response = self.client.post('/ats-score', json={
                'resume_text': 'Built web interfaces for customers and improved page performance.',
                'job_text': 'Develop frontend experiences for customers.',
                'required_skills': 'React'
            })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertTrue(result['semantic_analysis']['available'])
        self.assertGreater(result['dimensions']['semantic_similarity'], 0)
        self.assertEqual(result['semantic_analysis']['matches'][0]['status'], 'matched')
        self.assertEqual(result['semantic_analysis']['matches'][0]['resume_evidence'], 'Built web interfaces for customers and improved page performance.')
        self.assertEqual(result['requirements_evidence'][0]['status'], 'missing')

    def test_missing_payload_returns_client_error(self):
        response = self.client.post('/ats-score', json={'resume_text': 'Skills: Java'})
        self.assertEqual(response.status_code, 400)

    def test_resume_extraction_rejects_paths_outside_upload_directory(self):
        response = self.client.post('/extract-resume-text', json={'file_path': 'C:/Windows/win.ini'})
        self.assertEqual(response.status_code, 403)

    def test_text_match_aliases_html_versions(self):
        response = self.client.post('/match-score', json={
            'resume_text': 'Created layouts with HTML and CSS.',
            'job_text': 'Build interfaces with HTML5 and CSS3.'
        })
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.get_json()['score'], 0)

    def test_skill_gap_separates_required_preferred_and_creates_plan(self):
        response = self.client.post('/skill-gap', json={
            'candidate_skills': 'HTML5, CSS',
            'required_skills': 'HTML, CSS, React',
            'preferred_skills': 'Docker, AWS'
        })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result['matched_skills'], ['HTML', 'CSS'])
        self.assertEqual(result['missing_skills'], ['React'])
        self.assertEqual(result['matched_preferred_skills'], [])
        self.assertEqual(result['missing_preferred_skills'], ['Docker', 'AWS'])
        self.assertEqual([item['category'] for item in result['learning_plan']], ['required', 'preferred', 'preferred'])
        self.assertEqual([item['priority'] for item in result['learning_plan']], ['high', 'medium', 'medium'])

    def test_skill_gap_can_create_plan_before_profile_skills_are_added(self):
        response = self.client.post('/skill-gap', json={
            'required_skills': 'Python',
            'preferred_skills': 'Docker'
        })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertEqual(result['coverage'], 0)
        self.assertEqual(len(result['learning_plan']), 2)

    def test_skill_gap_with_only_preferred_skills_does_not_claim_required_coverage(self):
        response = self.client.post('/skill-gap', json={
            'preferred_skills': 'Docker'
        })

        self.assertEqual(response.status_code, 200)
        result = response.get_json()
        self.assertIsNone(result['coverage'])
        self.assertEqual(result['learning_plan'][0]['category'], 'preferred')


if __name__ == '__main__':
    unittest.main()
