import { StructuredJd } from '../types';

/**
 * Convert a StructuredJd into a well-formatted markdown string for preview.
 * Pure function — no DOM or rendering side-effects.
 */
export function formatStructuredJdToMarkdown(jd: StructuredJd | null): string {
  if (!jd) {
    return '### Analyzing Job Description...\n\nPlease wait while the AI structures the document.';
  }

  const output: string[] = [];

  const header = [jd.job_title, jd.company_name].filter(Boolean).join(' | ');
  if (header) output.push(`### ${header}`);

  const positionInfo: string[] = [];
  if (jd.location) positionInfo.push(`**📍 Location:** ${jd.location}`);
  if (jd.work_type) positionInfo.push(`**💼 Type:** ${jd.work_type}`);
  if (jd.salary) positionInfo.push(`**💰 Salary:** ${jd.salary}`);
  if (jd.experience_required) positionInfo.push(`**⏰ Experience:** ${jd.experience_required}`);
  if (jd.education_required) positionInfo.push(`**🎓 Education:** ${jd.education_required}`);
  if (positionInfo.length > 0) {
    output.push('## 🏢 Position Information');
    output.push(positionInfo.join('\n'));
  }

  if (jd.job_summary) {
    output.push('## 🎯 Job Description');
    output.push(jd.job_summary);
  }

  if (jd.key_responsibilities?.length > 0) {
    output.push('## Key Responsibilities');
    output.push(jd.key_responsibilities.map((item) => `- ${item}`).join('\n'));
  }

  if (jd.requirements) {
    const reqs: string[] = [];
    if (jd.requirements.mandatory) {
      const mandatoryItems: string[] = [];
      if (jd.requirements.mandatory.education) mandatoryItems.push(`Education: ${jd.requirements.mandatory.education}`);
      if (jd.requirements.mandatory.experience) mandatoryItems.push(`Experience: ${jd.requirements.mandatory.experience}`);
      if (jd.requirements.mandatory.technical_skills?.length > 0) {
        mandatoryItems.push(`Technical Skills: ${jd.requirements.mandatory.technical_skills.join(', ')}`);
      }
      if (jd.requirements.mandatory.languages?.length > 0) {
        mandatoryItems.push(`Languages: ${jd.requirements.mandatory.languages.join(', ')}`);
      }
      if (mandatoryItems.length > 0) {
        reqs.push('### Mandatory');
        reqs.push(mandatoryItems.join('\n\n'));
      }
    }
    if (jd.requirements.preferred?.length > 0) {
      reqs.push('### Preferred');
      reqs.push(jd.requirements.preferred.map((item) => `- ${item}`).join('\n'));
    }
    if (reqs.length > 0) {
      output.push('## ✅ Candidate Requirements');
      output.push(...reqs);
    }
  }

  if (jd.benefits) {
    const bens: string[] = [];
    if (jd.benefits.salary_and_bonus?.length > 0) {
      bens.push('### Salary & Bonus');
      bens.push(jd.benefits.salary_and_bonus.map((item) => `- ${item}`).join('\n'));
    }
    if (jd.benefits.welfare?.length > 0) {
      bens.push('### Welfare');
      bens.push(jd.benefits.welfare.map((item) => `- ${item}`).join('\n'));
    }
    if (bens.length > 0) {
      output.push('## 🎁 Benefits & Perks');
      output.push(...bens);
    }
  }

  if (jd.application_info) {
    const appInfo: string[] = [];
    if (jd.application_info.deadline) appInfo.push(`**🗓️ Deadline:** ${jd.application_info.deadline}`);
    if (jd.application_info.vacancies) appInfo.push(`**👥 Vacancies:** ${jd.application_info.vacancies}`);
    if (jd.application_info.contact) appInfo.push(`**📧 Contact:** ${jd.application_info.contact}`);
    if (jd.application_info.how_to_apply) appInfo.push(`**🌐 How to Apply:** ${jd.application_info.how_to_apply}`);
    if (appInfo.length > 0) {
      output.push('## 📞 Application Information');
      output.push(appInfo.join('\n'));
    }
  }

  if (jd.required_documents?.length > 0) {
    output.push('## Required Documents');
    output.push(jd.required_documents.map((item) => `- ${item}`).join('\n'));
  }

  if (jd.company_summary) {
    output.push('## 🏭 About the Company');
    output.push(jd.company_summary);
  }

  if (jd.why_choose_us?.length > 0) {
    output.push('## 🌟 Why Choose Us');
    output.push(jd.why_choose_us.map((item) => `- ${item}`).join('\n'));
  }

  return output.join('\n\n').trim();
}
