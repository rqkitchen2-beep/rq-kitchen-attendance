/* RQ Attendance — language (ar/en) + theme (light/dark). Loaded in <head> before the app. */
(function () {
  'use strict';
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  const LANG = LS('rq_lang') === 'en' ? 'en' : 'ar';
  const root = document.documentElement;
  root.lang = LANG; root.dir = LANG === 'en' ? 'ltr' : 'rtl';
  window.RQ_LANG = LANG;

  /* ---------- theme ---------- */
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const t = LS('rq_theme');
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t); else root.removeAttribute('data-theme');
    const dark = t ? t === 'dark' : mq.matches;
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = '#1C1917';
    root.classList.toggle('is-dark', dark);
    return dark;
  }
  applyTheme();
  mq.addEventListener && mq.addEventListener('change', applyTheme);

  /* ---------- dictionary (Arabic → English) ---------- */
  const D = {
    'RQ Kitchen — الحضور والانصراف': 'RQ Kitchen — Attendance', 'الحضور والانصراف': 'Attendance', 'جاري الاتصال…': 'Connecting…', 'متصل': 'Online', 'غير متصل': 'Offline',
    'خروج': 'Sign out', 'تسجيل': 'Clock', 'تقاريري': 'My report', 'اليوم': 'Today', 'الجدول': 'Schedule', 'التقارير': 'Reports', 'الإعدادات': 'Settings',
    'ثبّت التطبيق على جوالك': 'Install the app on your phone', 'للوصول السريع كل يوم.': 'For quick access every day.', 'تثبيت': 'Install', 'إغلاق': 'Close',
    'من Safari اضغط زر المشاركة': 'In Safari tap the Share button', 'ثم «إضافة إلى الشاشة الرئيسية».': 'then “Add to Home Screen”.',
    'جاري التحميل…': 'Loading…', 'تسجيل الدخول': 'Sign in', 'البريد الإلكتروني': 'Email', 'الرقم السري': 'PIN', 'دخول': 'Sign in',
    'موظف جديد؟': 'New employee?', 'سجّل حسابك': 'Create your account', 'نسيت الرقم السري؟': 'Forgot your PIN?', 'نسيت الرقم السري': 'Forgot your PIN',
    'تسجيل موظف جديد': 'New employee sign-up',
    'اكتب بياناتك واختر رقماً سرياً من 4 إلى 6 أرقام. بعد اعتماد المدير لحسابك يفتح لك اختيار الفرع وتسجيل الحضور في مواعيد الدوام.': 'Enter your details and choose a 4–6 digit PIN. Once the manager approves your account, branch selection and clock-in open during your shift times.',
    'الاسم الكامل': 'Full name', 'الرقم السري (4 إلى 6 أرقام)': 'PIN (4–6 digits)', 'تأكيد الرقم السري': 'Confirm PIN', 'إنشاء حسابي': 'Create my account', 'رجوع': 'Back',
    'تواصل مع المدير ليعيّن لك رقماً سرياً جديداً، ثم ادخل به وغيّره من «تقاريري».': 'Ask the manager to set a new PIN for you, then sign in with it and change it from “My report”.',
    'حسابك بانتظار الاعتماد': 'Your account is awaiting approval', 'أرسلنا بياناتك للمدير. بمجرد اعتماد حسابك يفتح لك تسجيل الحضور هنا تلقائياً.': 'Your details were sent to the manager. Clock-in opens here automatically once your account is approved.',
    'تحديث': 'Refresh', 'أهلاً بك': 'Welcome', 'أنت داخل كمدير. من القائمة تصل إلى الحضور اليوم والجدول والتقارير والإعدادات.': 'You are signed in as manager. Use the menu for today’s attendance, schedule, reports and settings.',
    'التنبيهات': 'Notifications', 'في أي فرع تداوم الآن؟': 'Which branch are you working at now?', 'الانصراف من الفرع الذي سجلت فيه الحضور': 'Clock out from the branch where you clocked in',
    'حضور': 'Clock in', 'انصراف': 'Clock out', 'تم': 'Done', 'مغلق': 'Closed', 'اضغط للتسجيل': 'Tap to record', 'اختر الفرع أولاً': 'Choose a branch first', 'انتهى دوام اليوم': 'Today’s shift is done', 'خارج وقت الدوام': 'Outside shift hours',
    'الحضور': 'In', 'الانصراف': 'Out', 'اليوم إجازتك': 'Today is your day off', 'لا يوجد تسجيل حضور اليوم.': 'No clock-in today.', 'التسجيل مغلق الآن': 'Clock-in is closed now', 'لا يوجد دوام متاح الآن.': 'No shift available now.',
    'اليوم إجازة حسب الجدول': 'Day off per schedule', 'اختر الفرع الذي تداوم فيه الآن': 'Choose the branch you are working at now',
    'تقريري': 'My report', 'أيام الحضور': 'Days present', 'ساعات العمل': 'Hours worked', 'أيام زيادة': 'Extra days', 'ساعات إضافية': 'Overtime hours',
    'تفاصيل راتبك': 'Your salary details', 'لم يُسجَّل راتبك بعد. راجع المدير.': 'Your salary hasn’t been set yet. Ask the manager.',
    'المستحق لهذا الشهر حتى الآن': 'Earned this month so far', 'الراتب الشهري': 'Monthly salary', 'قيمة اليوم': 'Daily rate', 'قيمة الأيام الزيادة': 'Extra days value', 'المكافأة': 'Bonus',
    'أيام الدوام المطلوبة للراتب الكامل': 'Work days required for full salary', 'أيام الخصم': 'Deducted days', 'الأساسي المستحق': 'Base earned', 'الحساب يكتمل بنهاية الشهر.': 'Final at month end.',
    'سجل الأيام': 'Daily log', 'التاريخ': 'Date', 'الفرع': 'Branch', 'الحالة': 'Status', 'الساعات': 'Hours', 'غائب': 'Absent', 'حاضر': 'Present', 'متأخر': 'Late',
    'لا توجد أيام مسجلة في هذا الشهر.': 'No recorded days this month.', 'تغيير الرقم السري': 'Change PIN', 'الرقم السري الحالي': 'Current PIN', 'الرقم السري الجديد (4 إلى 6 أرقام)': 'New PIN (4–6 digits)',
    'حفظ الرقم الجديد': 'Save new PIN', 'تسجيل الخروج': 'Sign out',
    'إجازة': 'Day off', 'لم يحضر': 'Not in', 'فرع آخر': 'another branch', 'لا يوجد موظفون في هذا الفرع.': 'No employees in this branch.', 'أضف الفروع من الإعدادات.': 'Add branches in Settings.',
    'بداية الدوام': 'Shift start', 'نهاية الدوام': 'Shift end', 'حفظ': 'Save', 'موقع الفرع غير محدد، والتسجيل فيه مغلق. حدده من الإعدادات.': 'Branch location not set, so clock-in is closed there. Set it in Settings.',
    'جدول الدوام': 'Work schedule', 'غيّر موعد أي موظف ليوم محدد أو اجعله إجازة. بدون تغيير يُطبَّق موعد الفرع الذي يسجل فيه.': 'Change any employee’s hours for a specific day or mark it as a day off. Otherwise the hours of the branch they clock in at apply.',
    'اليوم السابق': 'Previous day', 'اليوم التالي': 'Next day', 'تطبيق على الجميع': 'Apply to everyone', 'اختر…': 'Choose…', 'حسب موعد الفرع': 'Branch hours', 'موعد مخصص': 'Custom hours',
    'من': 'From', 'إلى': 'To', 'حفظ جدول اليوم': 'Save this day', 'نسخ إلى اليوم التالي': 'Copy to next day', 'حسب الفرع (إجازة أسبوعية)': 'Per branch (weekly day off)', 'حسب موعد الفرع الذي يسجل فيه': 'Hours of the branch they clock in at',
    'لا يوجد موظفون معتمدون بعد.': 'No approved employees yet.',
    'هذا الشهر': 'This month', 'الشهر الماضي': 'Last month', 'آخر 7 أيام': 'Last 7 days', 'تصدير Excel': 'Export Excel', 'كل الفروع': 'All branches',
    'ملخص الفروع': 'Branch summary', 'الرواتب': 'Payroll', 'ملخص الموظفين': 'Employee summary', 'الموظفون': 'Employees', 'الغياب': 'Absences', 'التأخير': 'Late', 'إضافي': 'Overtime',
    'الموظف': 'Employee', 'الفروع': 'Branches', 'غياب': 'Absent', 'تأخير': 'Late', 'دقائق التأخير': 'Late minutes', 'بدون انصراف': 'No clock-out', 'الراتب': 'Salary', 'قيمة الزيادة': 'Extra value', 'المستحق': 'Net pay',
    'غير محدد': 'Not set', 'لا يوجد موظفون.': 'No employees.', 'ساعات عمل': 'Hours worked', 'مرات تأخير': 'Late arrivals', 'أيام غياب': 'Absent days',
    'إجمالي المستحق': 'Total payable', 'إجمالي الرواتب': 'Total salaries', 'المكافآت': 'Bonuses', 'داوموا أيام زيادة': 'Worked extra days', 'حصلوا على المكافأة': 'Got the bonus',
    'عام': 'General', 'سماحية التأخير (دقائق)': 'Late grace (minutes)', 'يفتح التسجيل قبل الدوام بـ (دقائق)': 'Clock-in opens before shift (minutes)',
    'تسجيل الموظف الجديد يحتاج موافقتي قبل الاستخدام': 'New sign-ups need my approval before use', 'طريقة حساب الراتب': 'Salary calculation',
    'قيمة اليوم = الراتب الشهري ÷ 30. الأيام الزيادة تُحسب في تقرير شهر كامل فقط.': 'Daily rate = monthly salary ÷ 30. Extra days count only in a full-month report.',
    'طريقة الحساب': 'Method', 'راتب كامل عند إكمال أيام الدوام ويُخصم النقص': 'Full salary on completing work days; missing days deducted', 'يُدفع عن كل يوم حضور': 'Paid per day present',
    'مكافأة عند حضور (يوم)': 'Bonus when present (days)', 'قيمة المكافأة (أيام)': 'Bonus value (days)', 'أيام الدوام للراتب الكامل': 'Work days for full salary',
    'الفروع ومواقعها': 'Branches & locations', 'قف داخل الفرع واضغط «استخدم موقعي الآن» لتثبيت موقعه. لفرع الترك حدّث الموقع كلما تغيّر مكانه.': 'Stand inside the branch and tap “Use my location now” to pin it. For the truck branch, update the location whenever it moves.',
    'إضافة فرع': 'Add branch', 'اسم الفرع': 'Branch name', 'النطاق (متر)': 'Radius (m)', 'الموقع غير محدد': 'Location not set', 'استخدم موقعي الآن': 'Use my location now', 'حذف الفرع': 'Delete branch', 'جاري التحديد…': 'Locating…',
    'سجّلوا بأنفسهم من الرابط. راجع بياناتهم ثم اعتمدهم.': 'They signed up from the link. Review and approve them.', 'بانتظار موافقتك': 'Awaiting your approval', 'اعتماد': 'Approve', 'رفض': 'Reject',
    'الاسم': 'Name', 'الراتب الشهري (درهم)': 'Monthly salary (AED)', 'فروعه الأساسية للتقارير (يستطيع التسجيل من أي فرع)': 'Home branches for reports (can clock in at any branch)',
    'يوم الإجازة الأسبوعي': 'Weekly day off', 'لا يوجد': 'None', 'رقم سري جديد': 'New PIN', 'إيقاف': 'Disable',
    'لا يوجد موظفون معتمدون بعد. أرسل رابط التطبيق للموظفين ليسجلوا حساباتهم.': 'No approved employees yet. Send the app link to staff so they can sign up.',
    'حفظ الإعدادات': 'Save settings', 'فرع جديد': 'New branch',
    'Same Passion Better Bites': 'Same Passion Better Bites',
    // messages
    'اكتب البريد والرقم السري.': 'Enter your email and PIN.', 'جاري الدخول…': 'Signing in…', 'البريد أو الرقم السري غير صحيح.': 'Wrong email or PIN.', 'تم إيقاف هذا الحساب. راجع المدير.': 'This account is disabled. Contact the manager.',
    'هذا البريد مسجل من قبل. ادخل من شاشة الدخول.': 'This email is already registered. Sign in instead.', 'اكتب اسمك الكامل.': 'Enter your full name.', 'اكتب بريداً إلكترونياً صحيحاً.': 'Enter a valid email.',
    'الرقم السري يجب أن يكون من 4 إلى 6 أرقام.': 'PIN must be 4 to 6 digits.', 'الرقم السري الحالي غير صحيح.': 'Current PIN is wrong.', 'تعذّر الدخول.': 'Couldn’t sign in.',
    'تعذّر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.': 'Couldn’t connect. Check your internet and try again.', 'الرقمان السريان غير متطابقين.': 'PINs don’t match.', 'الرقمان غير متطابقين.': 'PINs don’t match.',
    'جاري إنشاء حسابك…': 'Creating your account…', 'تعذّر إنشاء الحساب.': 'Couldn’t create the account.', 'تم حفظ الرقم السري الجديد.': 'New PIN saved.', 'لم يتم الحفظ.': 'Not saved.', 'لم يتم الحفظ. حاول مرة أخرى.': 'Not saved. Try again.',
    'تعذّر تحميل البيانات. تحقق من الإنترنت وحاول مرة أخرى.': 'Couldn’t load data. Check your internet and try again.',
    'انتهت الجلسة. ادخل مرة أخرى.': 'Session expired. Sign in again.', 'حسابك غير مفعّل. راجع المدير.': 'Your account isn’t active. Contact the manager.', 'اختر الفرع.': 'Choose a branch.',
    'موقع هذا الفرع غير محدد. راجع المدير.': 'This branch’s location isn’t set. Contact the manager.', 'اليوم إجازتك حسب الجدول.': 'Today is your day off per schedule.', 'سجلت حضورك وانصرافك اليوم.': 'You already clocked in and out today.',
    'اختر الفرع الذي تداوم فيه.': 'Choose the branch you are working at.', 'جاري تحديد موقعك…': 'Getting your location…', 'جاري التسجيل…': 'Recording…',
    'لم يُسمح بالوصول للموقع. فعّل صلاحية الموقع للتطبيق ثم حاول مرة أخرى.': 'Location access was denied. Allow location for the app and try again.',
    'تعذّر تحديد موقعك. تأكد من تشغيل GPS وحاول مرة أخرى.': 'Couldn’t get your location. Make sure GPS is on and try again.', 'لم يتم التسجيل. تحقق من الاتصال وحاول مرة أخرى.': 'Not recorded. Check your connection and try again.',
    'التسجيل مغلق الآن.': 'Clock-in is closed now.', 'لم يتم التسجيل.': 'Not recorded.', 'حدد وقت البداية والنهاية.': 'Set start and end time.',
    'لم يتم النسخ. حاول مرة أخرى.': 'Not copied. Try again.', 'مكتبة Excel لم تُحمّل بعد. انتظر لحظة وحاول مرة أخرى.': 'Excel library not loaded yet. Wait a moment and try again.', 'تم تصدير الملف.': 'File exported.',
    'تعذّر تحديد الموقع. فعّل صلاحية الموقع وحاول مرة أخرى.': 'Couldn’t get location. Allow location access and try again.', 'لم يتم التنفيذ. حاول مرة أخرى.': 'Not done. Try again.',
    'تم اعتماد الموظف، ووصله تنبيه. أضف راتبه وفروعه ثم احفظ.': 'Employee approved and notified. Add salary and branches, then save.', 'تم إيقاف الحساب.': 'Account disabled.',
    'رفض هذا الطلب؟': 'Reject this request?', 'إيقاف هذا الحساب؟ لن يستطيع الدخول، وتبقى سجلاته محفوظة.': 'Disable this account? They won’t be able to sign in; their records are kept.',
    'تم تعيين الرقم السري الجديد. أعطه للموظف.': 'New PIN set. Give it to the employee.', 'جاري الحفظ…': 'Saving…', 'تم حفظ الإعدادات، ووصلت التنبيهات للموظفين المعنيين.': 'Settings saved; affected employees were notified.',
    'لم يتم حفظ كل التغييرات. تحقق من الاتصال وحاول مرة أخرى.': 'Not all changes were saved. Check your connection and try again.', 'ضع رابط ومفتاح Supabase في ملف config.js': 'Set the Supabase URL and key in config.js',
    // notifications (from the database)
    'تم تعديل راتبك. التفاصيل في «تقاريري».': 'Your salary was updated. Details in “My report”.', 'تم اعتماد حسابك. أهلاً بك في RQ Kitchen.': 'Your account was approved. Welcome to RQ Kitchen.',
    'تم تحديث فروعك.': 'Your branches were updated.', 'تم تغيير يوم إجازتك الأسبوعية.': 'Your weekly day off was changed.', 'تم تعديل اسمك في السيستم.': 'Your name was updated.',
    'تم تحديث طريقة حساب الراتب.': 'The salary calculation was updated.', 'أعاد المدير تعيين رقمك السري.': 'The manager reset your PIN.',
    // Excel headers
    'البريد': 'Email', 'صافي المستحق': 'Net pay', 'مكافأة الحضور الكامل': 'Full attendance bonus', 'أيام بدون انصراف': 'Days without clock-out', 'مرات التأخير': 'Late arrivals', 'أيام الغياب': 'Absent days',
    'الملخص': 'Summary', 'السجل اليومي': 'Daily log', 'يوم الأسبوع': 'Weekday',
    'تسجيل حضور يدوي': 'Manual attendance', 'للأيام السابقة، أو لتصحيح يوم نسي فيه الموظف التسجيل. يصل للموظف تنبيه بأي تعديل.': 'For past days, or to fix a day the employee forgot to clock. The employee is notified of any change.',
    'وقت الحضور': 'Clock-in time', 'وقت الانصراف': 'Clock-out time', 'حفظ الحضور': 'Save attendance', 'حذف السجل': 'Delete record', 'يدوي': 'Manual',
    'يوجد سجل يدوي لهذا اليوم. يمكنك تعديله أو حذفه.': 'A manual record exists for this day. You can edit or delete it.', 'يوجد سجل لهذا اليوم سجّله الموظف. يمكنك تعديله أو حذفه.': 'The employee clocked this day. You can edit or delete it.',
    'لا يوجد سجل لهذا اليوم.': 'No record for this day.', 'لا يمكن تسجيل حضور ليوم قادم.': 'Can’t record a future day.', 'حدد وقت الحضور.': 'Set the clock-in time.', 'اختر الموظف.': 'Choose the employee.',
    'اختر الموظف واليوم.': 'Choose the employee and day.', 'تم حفظ الحضور، ووصل للموظف تنبيه.': 'Attendance saved; the employee was notified.', 'حذف سجل حضور هذا اليوم؟': 'Delete this day’s attendance record?',
    'تم حذف السجل.': 'Record deleted.',
    "هذا الحساب مربوط بجوال آخر. أرسلنا طلباً للمدير ليوافق على هذا الجوال، ثم حاول مرة أخرى.": "This account is linked to another phone. We sent a request to the manager to approve this phone; try again after approval.",
    "هذا الحساب مربوط بجوال آخر، ولا يمكن التسجيل من هذا الجوال. أرسلنا طلباً للمدير.": "This account is linked to another phone, so you can’t clock from this one. A request was sent to the manager.",
    "هل تريد تسجيل الانصراف الآن؟": "Clock out now?",
    "ملخص اليوم": "Today’s summary",
    "مشاركة": "Share",
    "حضروا": "Present",
    "في الموعد": "On time",
    "متأخرون": "Late",
    "لم يسجّلوا": "Not clocked in",
    "المتأخرون": "Late arrivals",
    "لم يسجّلوا بعد موعدهم": "Not clocked in after their time",
    "لم يحن موعدهم": "Not due yet",
    "د": "min",
    "طلبات الإجازة": "Leave requests",
    "موافقة": "Approve",
    "رفض طلب الإجازة؟": "Reject this leave request?",
    "إرسال إعلان للموظفين": "Send an announcement",
    "يصل كتنبيه داخل التطبيق.": "Delivered as an in-app notification.",
    "اكتب الإعلان هنا…": "Write the announcement…",
    "كل الموظفين": "All employees",
    "إرسال الإعلان": "Send announcement",
    "اكتب نص الإعلان.": "Write the announcement text.",
    "إرسال الإعلان؟": "Send the announcement?",
    "لم يتم الإرسال. حاول مرة أخرى.": "Not sent. Try again.",
    "لم يتم الإرسال.": "Not sent.",
    "طلب إجازة": "Leave request",
    "النوع": "Type",
    "إجازة سنوية": "Annual leave",
    "إجازة مرضية": "Sick leave",
    "أخرى": "Other",
    "ملاحظة": "Note",
    "إرسال الطلب": "Send request",
    "قيد المراجعة": "Pending",
    "موافق عليها": "Approved",
    "مرفوضة": "Rejected",
    "إلغاء": "Cancel",
    "تحقق من التاريخين.": "Check the dates.",
    "أقصى مدة للطلب 60 يوماً.": "Maximum request length is 60 days.",
    "لديك طلب آخر في نفس الأيام.": "You already have a request for these days.",
    "حسابك غير مفعّل.": "Your account isn’t active.",
    "تم إرسال طلب الإجازة للمدير.": "Leave request sent to the manager.",
    "سلف وخصومات ومكافآت": "Advances, deductions & bonuses",
    "تُطبَّق على راتب الشهر المختار، وتصل للموظف كتنبيه.": "Applied to the selected month’s salary; the employee is notified.",
    "الشهر": "Month",
    "سلفة": "Advance",
    "خصم": "Deduction",
    "مكافأة": "Bonus",
    "المبلغ (درهم)": "Amount (AED)",
    "إضافة": "Add",
    "حذف": "Delete",
    "حذف هذا البند؟": "Delete this item?",
    "لا توجد بنود لهذا الشهر.": "No items for this month.",
    "اختر الموظف والشهر.": "Choose the employee and month.",
    "اكتب المبلغ.": "Enter the amount.",
    "تمت الإضافة، ووصل للموظف تنبيه.": "Added; the employee was notified.",
    "خصم التأخير": "Late deduction",
    "سلف وخصومات": "Advances & deductions",
    "مكافآت": "Bonuses",
    "أيام إجازة معتمدة": "Approved leave days",
    "سلف": "Advances",
    "خصومات": "Deductions",
    "صافي المستحق": "Net pay",
    "التأخير والانصراف": "Lateness & clock-out",
    "خصم التأخير من الراتب": "Late deduction from salary",
    "لا يوجد خصم (يُسجَّل فقط)": "No deduction (recorded only)",
    "خصم أيام حسب عدد مرات التأخير": "Deduct days per number of late arrivals",
    "خصم بالدقيقة": "Deduct per minute",
    "كل كم مرة تأخير": "Every N late arrivals",
    "يُخصم (أيام)": "Deduct (days)",
    "ساعات يوم العمل": "Work-day hours",
    "أقل وقت بين الحضور والانصراف (دقائق)": "Minimum time between clock-in and clock-out (min)",
    "يطلب الدخول من جوال جديد.": "Requests sign-in from a new phone.",
    "موافقة على جوال جديد": "Approve new phone",
    "فك ربط الجوال": "Unlink phone",
    "تمت الموافقة على الجوال الجديد، ووصل للموظف تنبيه.": "New phone approved; the employee was notified.",
    "فك ربط الجوال؟ سيُربط الحساب بأول جوال يدخل منه الموظف.": "Unlink the phone? The account will link to the next phone the employee uses.",
    "تم فك ربط الجوال.": "Phone unlinked.", "حضور الموظفين": "Staff attendance", "يتحدث تلقائياً كل 30 ثانية.": "Updates automatically every 30 seconds.", "داخل الدوام": "On shift", "انصرفوا": "Left", "لم يسجّل": "Not in", "أيام الدوام هذا الشهر": "Days worked this month", "آخر موعد حضور للحصول على نقطة": "Latest clock-in time to earn a point", "نقطتان لمن يحضر حتى موعد العمل الرئيسي، ونقطة لمن يحضر حتى آخر موعد للنقاط، بشرط ألا ينصرف قبل آخر 15 دقيقة من الدوام.": "2 points for clocking in by the main start time, 1 point by the latest points time — provided they don’t clock out before the last 15 minutes of the shift.", "نجوم الالتزام هذا الشهر": "This month’s punctuality stars", "نقطة": "pts", "التزم بمواعيد الحضور والانصراف لتظهر هنا وتحصل على مكافأة نهاية الشهر.": "Keep to your clock-in and clock-out times to appear here and earn the month-end reward.", "قيمة النقطة (درهم)": "Point value (AED)", "مكافأة النقاط": "Points reward", "درهم": "AED", "كل نقطة تتحول إلى مال يُضاف إلى راتبك في نهاية الشهر.": "Every point turns into money added to your salary at month end.", "النقاط ستتحول إلى مكافأة مالية في نهاية الشهر.": "Points will turn into a cash reward at the end of the month.", "نقاط التميّز": "Excellence points", "لوحة التميّز": "Excellence board", "إرسال تشجيع للمميزين": "Send encouragement to top staff", "موعد العمل الرئيسي (للنقطتين)": "Main start time (for 2 points)", "ملتزم بالمواعيد": "On-time all month", "حضور مبكر متكرر": "Repeatedly early", "نقطة هذا الشهر": "points this month", "أيام نقطتين": "2-point days", "أيام نقطة": "1-point days", "أيام بدون نقاط": "Days without points", "نقطتان: حضور قبل موعد العمل الرئيسي وانصراف في الموعد.": "2 points: clock in before the main start time and clock out on time.", "نقطة: حضور في موعد فرعك وانصراف في الموعد.": "1 point: clock in by your branch time and clock out on time.", "المميزون في نهاية الشهر يحصلون على مكافأة.": "Top staff are rewarded at the end of the month.", "النقاط": "Points", "التميّز": "Excellence", "نقطتان لمن يحضر قبل موعد العمل الرئيسي وينصرف في الموعد، ونقطة لمن يحضر في موعد فرعه وينصرف في الموعد.": "2 points for clocking in before the main start time and out on time; 1 point for clocking in by the branch time and out on time.", "لا يوجد موظفون لديهم نقاط في هذه الفترة.": "No employees have points in this period.", "يُسمح بالانصراف قبل نهاية الدوام بـ (دقائق)": "Clock-out allowed before shift end (min)",
    "وافق المدير على جوالك الجديد. يمكنك الدخول الآن.": "The manager approved your new phone. You can sign in now.", 'تحديد على الخريطة': 'Pick on map', 'تحديد موقع الفرع': 'Set branch location', 'ابحث عن مكان أو الصق رابط خرائط Google': 'Search a place or paste a Google Maps link',
    'بحث': 'Search', 'خريطة': 'Map', 'قمر صناعي': 'Satellite', 'اضغط على الخريطة أو اسحب الدبوس إلى باب الفرع بالضبط. الدائرة توضح نطاق التسجيل.': 'Tap the map or drag the pin to the exact branch door. The circle shows the clock-in radius.',
    'موقعي الآن': 'My location', 'اعتماد الموقع': 'Use this location', 'الخريطة لم تُحمّل بعد. تحقق من الإنترنت وحاول مرة أخرى.': 'The map hasn’t loaded yet. Check your internet and try again.',
    'هذا الرابط لا يحتوي على إحداثيات. افتح الموقع في خرائط Google، ثم انسخ الرابط من شريط المتصفح، أو ابحث بالاسم.': 'This link has no coordinates. Open the place in Google Maps and copy the link from the browser bar, or search by name.',
    'جاري البحث…': 'Searching…', 'لا توجد نتائج. جرّب اسماً آخر، أو حرّك الخريطة واضغط على المكان.': 'No results. Try another name, or move the map and tap the spot.',
    'تعذّر البحث. تحقق من الإنترنت وحاول مرة أخرى.': 'Search failed. Check your internet and try again.',
    'لا توجد نتائج. جرّب اسم المنطقة (مثل مدينة محمد بن زايد)، ثم قرّب الخريطة واضغط على مكان الفرع، أو الصق الإحداثيات من خرائط Google.': 'No results. Try the area name (e.g. Mohammed Bin Zayed City), then zoom in and tap the branch spot, or paste coordinates from Google Maps.', 'اختر المكان على الخريطة أولاً.': 'Pick a spot on the map first.', 'لم يتم الحذف. حاول مرة أخرى.': 'Not deleted. Try again.'
  };
  const P = [
    [/^تم تسجيل حضورك في (.+) الساعة (.+) \(متأخر (\d+) دقيقة\)\.$/, m => `Clocked in at ${m[1]}, ${m[2]} (${m[3]} min late).`],
    [/^تم تسجيل حضورك في (.+) الساعة (.+)\.$/, m => `Clocked in at ${m[1]}, ${m[2]}.`],
    [/^تم تسجيل انصرافك الساعة (.+) في (.+)\.$/, m => `Clocked out at ${m[2]}, ${m[1]}.`],
    [/^موقعك لا يطابق فرع (.+): أنت على بعد (\d+) متر منه، والمسموح (\d+) متر\. دقة موقعك الآن ±(\d+) متر؛ إن كانت كبيرة اقترب من باب الفرع وحاول مرة أخرى\.$/,
      m => `Your location doesn’t match ${m[1]}: you are ${m[2]} m away; allowed is ${m[3]} m. GPS accuracy now ±${m[4]} m — if it’s large, move near the branch door and try again.`],
    [/^التسجيل مغلق الآن\. يفتح الساعة (.+)\.$/, m => `Clock-in is closed. It opens at ${m[1]}.`],
    [/^محاولات كثيرة\. حاول بعد الساعة (.+)\.$/, m => `Too many attempts. Try again after ${m[1]}.`],
    [/^يفتح تسجيل الحضور الساعة (.+) في (.+)\.$/, m => `Clock-in opens at ${m[1]} at ${m[2]}.`],
    [/^يفتح تسجيل الحضور الساعة (.+)، وعندها تختار الفرع الذي تداوم فيه\.$/, m => `Clock-in opens at ${m[1]}. You will then choose the branch you are working at.`],
    [/^دوام (.+?) (\d{1,2}:\d{2}.*)$/, m => `${m[1]} shift ${m[2]}`],
    [/^موعد الدوام (.+)$/, m => `Hours ${m[1]}`],
    [/^داخل الدوام الآن: (\d+) من (\d+)$/, m => `On shift now: ${m[1]} of ${m[2]}`],
    [/^متأخر (\d+) د · (.+)$/, m => `Late ${m[1]} min · ${m[2]}`],
    [/^متأخر (\d+) د$/, m => `Late ${m[1]} min`],
    [/^حاضر (\d.+)$/, m => `In ${m[1]}`],
    [/^انصرف (.+)$/, m => `Left ${m[1]}`],
    [/^يبدأ (.+)$/, m => `Starts ${m[1]}`],
    [/^(حاضر|عمل) في (.+)$/, m => `${m[1] === 'حاضر' ? 'In' : 'Worked'} at ${m[2] === 'فرع آخر' ? 'another branch' : m[2]}`],
    [/^تقرير (.+)$/, m => `${m[1]} — report`],
    [/^أهلاً (.+?)\. أرسلنا بياناتك للمدير، وبمجرد اعتماد حسابك يفتح لك تسجيل الحضور هنا تلقائياً\.$/, m => `Hi ${m[1]}. Your details were sent to the manager. Clock-in opens here automatically once your account is approved.`],
    [/^مرات التأخير \((\d+) د\)$/, m => `Late arrivals (${m[1]} min)`],
    [/^الراتب الكامل عند (\d+) يوم دوام، وكل يوم زيادة يُحسب لك بقيمة يوم\.$/, m => `Full salary at ${m[1]} work days; every extra day is paid at the daily rate.`],
    [/^راتب كامل لمن يداوم (\d+) يوماً\. يُخصم عن كل يوم ناقص، ويُضاف عن كل يوم زيادة\.$/, m => `Full salary for ${m[1]} work days. Each missing day is deducted and each extra day is added.`],
    [/^يُدفع عن كل يوم حضور، مع مكافأة (\d+) أيام لمن يحضر (\d+) يوماً\.$/, m => `Paid per day present, with a ${m[1]}-day bonus for ${m[2]} days present.`],
    [/^تم تحديد موقع (.+) \(دقة ±(\d+) م\)\. اضغط «حفظ الإعدادات»\.$/, m => `${m[1]} location set (±${m[2]} m). Tap “Save settings”.`],
    [/^تم حفظ جدول (\S+)، ووصل تنبيه لكل موظف تغيّر موعده\.$/, m => `Schedule for ${m[1]} saved; changed employees were notified.`],
    [/^تم النسخ إلى (\S+)\. عدّل ما تريد واحفظ\.$/, m => `Copied to ${m[1]}. Edit and save.`],
    [/^حذف فرع (.+)؟ سجلات الحضور السابقة تبقى محفوظة\.$/, m => `Delete branch ${m[1]}? Past attendance records are kept.`],
    [/^رقم سري جديد لـ (.+) \(4 إلى 6 أرقام\):$/, m => `New PIN for ${m[1] === 'الموظف' ? 'the employee' : m[1]} (4–6 digits):`],
    [/^الموقع: (.+)$/, m => `Location: ${m[1]}`],
    [/^تحديد موقع (.+)$/, m => `Set location: ${m[1]}`],
    [/^تم تحديد موقع (.+) على الخريطة\. اضغط «حفظ الإعدادات»\.$/, m => `${m[1]} location set on the map. Tap “Save settings”.`],
    [/^(.+) \(بدون انصراف\)$/, m => `${T(m[1])} (no clock-out)`],
    [/^تم تغيير موعد دوامك يوم (\S+) إلى (.+)\.$/, m => `Your hours on ${m[1]} changed to ${m[2]}.`],
    [/^تم تحديد يوم (\S+) إجازة لك\.$/, m => `${m[1]} was set as your day off.`],
    [/^عاد موعد دوامك يوم (\S+) إلى موعد الفرع\.$/, m => `Your hours on ${m[1]} are back to branch hours.`],
    [/^تغيّر موعد دوام فرع (.+) إلى (.+)\.$/, m => `${m[1]} branch hours changed to ${m[2]}.`],
    [/^(سجّل|عدّل) المدير حضورك يوم (\S+) \((.+)\)\.$/, m => `The manager ${m[1] === 'سجّل' ? 'recorded' : 'edited'} your attendance on ${m[2]} (${m[3]}).`],
    [/^حذف المدير سجل حضورك يوم (\S+)\.$/, m => `The manager deleted your attendance record for ${m[1]}.`],
    [/^لا يمكن تسجيل الانصراف قبل مرور (\d+) دقيقة على الحضور\. انتظر (\d+) دقيقة\.$/, m => `You can’t clock out within ${m[1]} minutes of clocking in. Wait ${m[2]} more minutes.`],
    [/^لا يمكن تسجيل الانصراف الآن\. انتظر (\d+) دقيقة\.$/, m => `You can’t clock out yet. Wait ${m[1]} minutes.`],
    [/^🌟 ممتاز يا (.+?)! حضرت مبكراً اليوم\. التزم بموعد الانصراف لتحصل على نقطتين وتظهر في نجوم الالتزام\.$/, m => `🌟 Excellent, ${m[1]}! You came early today. Keep to the clock-out time to earn 2 points and appear in the punctuality stars.`],
    [/^👏 أحسنت يا (.+?)! حضرت في الموعد\. التزم بموعد الانصراف لتحصل على نقطة وتظهر في نجوم الالتزام\.$/, m => `👏 Well done, ${m[1]}! You came on time. Keep to the clock-out time to earn 1 point and appear in the punctuality stars.`],
    [/^(🌟|👏) .+? (Excellent|Well done), (.+)$/, m => `${m[1]} ${m[2]}, ${m[3]}`],
    [/^🌟 ممتاز يا (.+?)! حضرت قبل موعد العمل الرئيسي\. انصرف في الموعد لتحصل على نقطتين تميّز اليوم\.$/, m => `🌟 Excellent, ${m[1]}! You arrived before the main start time. Clock out on time to earn 2 excellence points today.`],
    [/^👏 أحسنت يا (.+?)! حضرت في الموعد\. انصرف في الموعد لتحصل على نقطة تميّز اليوم\.$/, m => `👏 Well done, ${m[1]}! You arrived on time. Clock out on time to earn 1 excellence point today.`],
    [/^مكافأة النقاط \((\d+) × (.+)\)$/, m => `Points reward (${m[1]} × ${m[2]})`],
    [/^إرسال تشجيع إلى (\d+) موظف؟$/, m => `Send encouragement to ${m[1]} employees?`],
    [/^تم إرسال التشجيع إلى (\d+) موظف\.$/, m => `Encouragement sent to ${m[1]} employees.`],
    [/^🌟 أحسنت يا .+? Well done! (.+)$/, m => `🌟 Well done! ${m[1]}`],
    [/^⚠️ لا يمكن تسجيل الانصراف الآن، لم ينتهِ موعد الدوام بعد\. الخروج قبل الموعد سيتم خصمه، ويجب الالتزام بالموعد مثل باقي فريق العمل\.$/, m => '⚠️ You can’t clock out yet — your shift hasn’t ended. Leaving early will be deducted; please keep to the schedule like the rest of the team.'],
    [/^تم إرسال الإعلان إلى (\d+) موظف\.$/, m => `Announcement sent to ${m[1]} employees.`],
    [/^خصم التأخير \((\d+) مرة، (\d+) د\)$/, m => `Late deduction (${m[1]} times, ${m[2]} min)`],
    [/^(تمت الموافقة على إجازتك|تم رفض طلب إجازتك) من (\S+) إلى (\S+)\.$/, m => `${m[1].startsWith('تمت') ? 'Your leave was approved' : 'Your leave request was rejected'}: ${m[2]} to ${m[3]}.`],
    [/^تمت إضافة (سلفة|خصم|مكافأة) على راتب شهر (\S+): (.+) درهم\.$/, m => `${({ 'سلفة': 'An advance', 'خصم': 'A deduction', 'مكافأة': 'A bonus' })[m[1]]} was added to your ${m[2]} salary: AED ${m[3]}.`],
    [/^تم حذف بند من راتب شهر (\S+)\.$/, m => `An item was removed from your ${m[1]} salary.`],
    [/^(إجازة|Day off): (\d+) · (لم يحن موعدهم|Not due yet): (\d+)$/, m => `Day off: ${m[2]} · Not due yet: ${m[4]}`]
  ];
  const AR = /[\u0600-\u06FF]/;
  function T(s) {
    if (LANG !== 'en' || s == null) return s;
    const str = String(s); if (!AR.test(str)) return str;
    const k = str.trim().replace(/\s+/g, ' ');
    if (D[k] != null) return str.replace(str.trim(), D[k]);
    for (const [re, fn] of P) { const m = k.match(re); if (m) return str.replace(str.trim(), fn(m)); }
    return str;
  }
  window.RQ_T = T;

  if (LANG === 'en') {
    const ATTRS = ['placeholder', 'aria-label', 'title'];
    const fixText = n => { const v = n.nodeValue; if (v && AR.test(v)) { const t = T(v); if (t !== v) n.nodeValue = t; } };
    const walk = node => {
      if (!node) return;
      if (node.nodeType === 3) return fixText(node);
      if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
      ATTRS.forEach(a => { const v = node.getAttribute(a); if (v && AR.test(v)) node.setAttribute(a, T(v)); });
      const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let c; while ((c = w.nextNode())) {
        if (c.nodeType === 3) fixText(c);
        else ATTRS.forEach(a => { const v = c.getAttribute(a); if (v && AR.test(v)) c.setAttribute(a, T(v)); });
      }
    };
    const start = () => {
      document.title = T(document.title);
      walk(document.body);
      new MutationObserver(ms => ms.forEach(m => {
        if (m.type === 'characterData') fixText(m.target);
        else m.addedNodes.forEach(walk);
      })).observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    const oc = window.confirm.bind(window), op = window.prompt.bind(window);
    window.confirm = m => oc(T(m)); window.prompt = (m, d) => op(T(m), d);
  }

  /* ---------- header buttons ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const lb = document.getElementById('langBtn'), tb = document.getElementById('themeBtn');
    if (lb) { lb.textContent = LANG === 'en' ? 'ع' : 'EN'; lb.setAttribute('aria-label', LANG === 'en' ? 'العربية' : 'English');
      lb.onclick = () => { LS('rq_lang', LANG === 'en' ? 'ar' : 'en'); location.reload(); }; }
    if (tb) {
      const paint = () => { const dark = root.classList.contains('is-dark');
        tb.innerHTML = dark ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
          : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
        tb.setAttribute('aria-label', dark ? (LANG === 'en' ? 'Light mode' : 'الوضع النهاري') : (LANG === 'en' ? 'Dark mode' : 'الوضع الليلي')); };
      paint();
      tb.onclick = () => { LS('rq_theme', root.classList.contains('is-dark') ? 'light' : 'dark'); applyTheme(); paint(); };
      mq.addEventListener && mq.addEventListener('change', paint);
    }
  });
})();
