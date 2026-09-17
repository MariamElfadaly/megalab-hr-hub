// Copied exactly from employee-tracker-v2/app.js — do not reorder keys,
// other stored data (checks objects) references these key strings.
export const CHECKLIST = [
  { key: 'c1', en: 'Case Status Statement', ar: 'بيان الحالة', mandatory: true, resp: 'company' },
  { key: 'c2', en: 'Appointment Decision', ar: 'قرار التعيين', mandatory: true, resp: 'company' },
  { key: 'c3', en: 'Employment Contract', ar: 'عقد العمل', mandatory: true, resp: 'company' },
  { key: 'c4', en: 'Academic Qualification', ar: 'المؤهل العلمي', mandatory: true, resp: 'employee' },
  { key: 'c5', en: 'Additional Academic / Professional Qualifications', ar: 'المؤهلات الأكاديمية والمهنية', mandatory: false, resp: 'employee' },
  { key: 'c6', en: 'Professional Practice License', ar: 'ترخيص مزاولة المهنة', mandatory: false, resp: 'employee' },
  { key: 'c7', en: 'CV / Resume', ar: 'السيرة الذاتية', mandatory: true, resp: 'employee' },
  { key: 'c8', en: 'National ID Copy', ar: 'صورة الرقم القومي', mandatory: true, resp: 'employee' },
  { key: 'c9', en: 'Criminal Record Check', ar: 'الفحص الجنائي', mandatory: true, resp: 'employee' },
  { key: 'c10', en: 'Experience Certificates', ar: 'شهادات الخبرة', mandatory: false, resp: 'employee' },
  { key: 'c11', en: 'Training Courses (training card & continuing education)', ar: 'الدورات التدريبية (كارت تدريب والتعليم المستمر)', mandatory: true, resp: 'company' },
  { key: 'c12', en: 'Pre-Employment Medical Exam', ar: 'الفحص الطبي عند التعيين', mandatory: true, resp: 'employee' },
  { key: 'c13', en: 'Declarations (confidentiality, no smoking, no harassment)', ar: 'الإقرارات (سرية المعلومات – عدم التدخين – عدم التحرش)', mandatory: true, resp: 'company' },
  { key: 'c14', en: 'Signed Job Description', ar: 'التوصيف الوظيفي (موقّع)', mandatory: true, resp: 'company' },
  { key: 'c15', en: 'Medical File (annual checks, vaccinations, clearance)', ar: 'الصحيفة الطبية (فحوصات سنوية – تطعيمات – كشف طبي)', mandatory: false, resp: 'company' },
  { key: 'c16', en: 'Work Instructions (leave, absence, working hours)', ar: 'تعليمات العمل (الإجازات – الغياب – مواعيد العمل)', mandatory: true, resp: 'company' },
  { key: 'c17', en: 'Orientation Form (new employee introduction)', ar: 'نموذج التهيئة (تقديم الموظف كعضو جديد)', mandatory: true, resp: 'company' },
  { key: 'c18', en: 'Performance Evaluation', ar: 'تقييم الأداء الوظيفي', mandatory: true, resp: 'company' },
  { key: 'c19', en: 'Job Risk Assessment', ar: 'تقييم مخاطر الوظيفة', mandatory: true, resp: 'company' },
  { key: 'c20', en: 'Incident & Occupational Exposure Report', ar: 'تقرير الحوادث والتعرض للمخاطر المهنية', mandatory: true, resp: 'company' },
  { key: 'c21', en: 'Appreciation Letters', ar: 'خطابات الشكر والتقدير', mandatory: false, resp: 'employee' },
  { key: 'c22', en: 'Penalties / Disciplinary Actions (if any)', ar: 'الجزاءات (إن وجدت)', mandatory: false, resp: 'employee' },
  { key: 'c23', en: 'ID Badge', ar: 'بطاقة تعريف (باچ)', mandatory: false, resp: 'company' },
  { key: 'c24', en: 'Uniform', ar: 'الزي الموحد', mandatory: false, resp: 'company', hasNumber: true, numberField: 'uniformNumber' },
  { key: 'c25', en: 'Locker', ar: 'الخزانة (اللوكر)', mandatory: false, resp: 'company', hasNumber: true, numberField: 'lockerNumber' },
  { key: 'c26', en: 'Name Label', ar: 'لافتة الاسم', mandatory: true, resp: 'company' },
  { key: 'c27', en: 'Drive File', ar: 'الملف الإلكتروني (درايف)', mandatory: true, resp: 'company' },
  { key: 'c28', en: 'System Account Created', ar: 'تم إنشاء حساب النظام', mandatory: true, resp: 'company' },
  { key: 'c29', en: 'Excel Sheet Updated', ar: 'تحديث شيت الإكسل', mandatory: true, resp: 'company' },
];

export const MANDATORY_KEYS = CHECKLIST.filter((c) => c.mandatory).map((c) => c.key);
export const OPTIONAL_KEYS = CHECKLIST.filter((c) => !c.mandatory).map((c) => c.key);

export function computeStatus(checks = {}) {
  const mDone = MANDATORY_KEYS.filter((k) => checks[k]).length;
  const oDone = OPTIONAL_KEYS.filter((k) => checks[k]).length;
  const status = mDone === MANDATORY_KEYS.length ? 'complete' : mDone === 0 ? 'empty' : 'progress';
  return { status, mDone, mTotal: MANDATORY_KEYS.length, oDone, oTotal: OPTIONAL_KEYS.length };
}

// Same tenure calculation as the original app.js
export function tenureString(startDate) {
  if (!startDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const now = new Date();
  if (isNaN(start.getTime()) || start > now) return '';
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts = [];
  if (years) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (months) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
  if (days || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  return parts.join(', ');
}
