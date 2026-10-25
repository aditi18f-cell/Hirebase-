import unittest

from app import app, canonical_skill, contains_skill


class ResumeAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

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
        self.assertIn('quantified_lines', result['signals'])
        self.assertTrue(result['suggestions'])
        self.assertTrue(all(isinstance(item, dict) for item in result['suggestions']))

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


if __name__ == '__main__':
    unittest.main()
