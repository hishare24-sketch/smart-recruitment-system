import type { Candidate } from '../interfaces/Candidate'

/* eslint-disable perfectionist/sort-objects */
export const mockCandidates: Candidate[] = [
  { id: 1, name: 'أحمد المنصور', title: 'مطوّر واجهات أمامية', location: 'الرياض', matchRate: 94, appliedAt: 'قبل يومين', status: 'new', skills: ['Vue.js', 'TypeScript', 'Vuetify', 'REST API'], experienceYears: 5, level: 'خبير', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مطوّر شغوف ببناء تجارب مستخدم سلسة وأنظمة قابلة للتوسّع.' },
  { id: 2, name: 'سارة العتيبي', title: 'مهندسة برمجيات', location: 'جدة', matchRate: 88, appliedAt: 'قبل 3 أيام', status: 'reviewing', skills: ['Vue.js', 'Node.js', 'MongoDB'], experienceYears: 4, level: 'متوسط', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مهندسة برمجيات متكاملة بخبرة في بناء تطبيقات الويب.' },
  { id: 3, name: 'خالد الحربي', title: 'مطوّر ويب', location: 'عن بُعد', matchRate: 79, appliedAt: 'قبل 4 أيام', status: 'interview', skills: ['JavaScript', 'React', 'CSS'], experienceYears: 3, level: 'متوسط', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مطوّر ويب يركّز على الأداء وقابلية الصيانة.' },
  { id: 4, name: 'نورة القحطاني', title: 'مطوّرة junior', location: 'الدمام', matchRate: 68, appliedAt: 'قبل أسبوع', status: 'reviewing', skills: ['HTML', 'CSS', 'Vue.js'], experienceYears: 1, level: 'مبتدئ', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'خريجة حاسب طموحة في بداية مسيرتها المهنية.' },
  { id: 5, name: 'محمد الشمري', title: 'مهندس Full Stack', location: 'الرياض', matchRate: 91, appliedAt: 'قبل يوم', status: 'new', skills: ['Vue.js', 'Laravel', 'MySQL', 'Docker'], experienceYears: 6, level: 'خبير', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مطوّر متكامل قاد مشاريع من الفكرة حتى الإطلاق.' },
  { id: 6, name: 'ريم الدوسري', title: 'مصممة UI/UX', location: 'جدة', matchRate: 84, appliedAt: 'قبل يومين', status: 'new', skills: ['Figma', 'Vue.js', 'Design Systems'], experienceYears: 4, level: 'متوسط', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مصممة ومطوّرة تجمع بين الجمال والوظيفة.' },
  { id: 7, name: 'عبدالله الغامدي', title: 'مطوّر أول', location: 'الخبر', matchRate: 86, appliedAt: 'قبل 3 أيام', status: 'reviewing', skills: ['Vue.js', 'TypeScript', 'Pinia', 'Vitest'], experienceYears: 7, level: 'خبير', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'خبير واجهات قاد فرقاً تقنية وحسّن الأداء بشكل ملحوظ.' },
  { id: 8, name: 'لينا سعد', title: 'مطوّرة واجهات', location: 'الرياض', matchRate: 77, appliedAt: 'قبل 5 أيام', status: 'new', skills: ['React', 'Vue.js', 'Tailwind'], experienceYears: 3, level: 'متوسط', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مطوّرة مهتمة بتجربة المستخدم والتفاصيل.' },
  { id: 9, name: 'فيصل العنزي', title: 'مهندس برمجيات', location: 'عن بُعد', matchRate: 72, appliedAt: 'قبل أسبوع', status: 'rejected', skills: ['Angular', 'TypeScript'], experienceYears: 5, level: 'خبير', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'خبرة واسعة لكن في إطار عمل مختلف.' },
  { id: 10, name: 'هند المطيري', title: 'مطوّرة junior', location: 'الرياض', matchRate: 65, appliedAt: 'قبل 6 أيام', status: 'reviewing', skills: ['HTML', 'JavaScript', 'Vue.js'], experienceYears: 2, level: 'مبتدئ', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'شغوفة بالتعلّم وتطوير مهاراتها بسرعة.' },
  { id: 11, name: 'يوسف البقمي', title: 'مطوّر Frontend', location: 'مكة', matchRate: 81, appliedAt: 'قبل 4 أيام', status: 'interview', skills: ['Vue.js', 'Nuxt', 'GraphQL'], experienceYears: 4, level: 'متوسط', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'متخصص في Vue و Nuxt مع اهتمام بالأداء.' },
  { id: 12, name: 'دانة الفهد', title: 'مهندسة واجهات أولى', location: 'الرياض', matchRate: 89, appliedAt: 'قبل يومين', status: 'new', skills: ['Vue.js', 'TypeScript', 'Storybook', 'CI/CD'], experienceYears: 6, level: 'خبير', appliedFor: 'مطوّر واجهات أمامية (Vue.js)', summary: 'مهندسة واجهات ببصمة قوية في بناء أنظمة التصميم.' },
]
/* eslint-enable perfectionist/sort-objects */

export function getCandidateById(id: number): Candidate | undefined {
  return mockCandidates.find(c => c.id === id)
}
