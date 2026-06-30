import type { ThemeDefinition } from 'vuetify'

// نظام الألوان المعتمد من وثيقة واجهات الاستخدام (UI/UX)
export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    'primary': '#1A365D', // أزرق داكن — الثقة والاحترافية
    'secondary': '#319795', // فيروزي — التفاعلات الإيجابية
    'accent': '#ED8936', // برتقالي — الأزرار المهمة (تقدم، قبول، إرسال)
    'success': '#38A169',
    'info': '#3182CE',
    'warning': '#DD6B20',
    'error': '#E53E3E', // أحمر — الإلغاء، الرفض، التنبيهات
    'background': '#F7FAFC', // خلفية فاتحة لراحة العين
    'surface': '#FFFFFF',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-accent': '#FFFFFF',
    'on-surface': '#2D3748', // نصوص داكنة للقراءة الواضحة
    'on-background': '#2D3748',
  },
  variables: {
    'border-color': '#2D3748',
    'theme-on-surface-variant': '#718096',
  },
}

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: {
    'primary': '#4299E1',
    'secondary': '#4FD1C5',
    'accent': '#F6AD55',
    'success': '#48BB78',
    'info': '#63B3ED',
    'warning': '#ED8936',
    'error': '#FC8181',
    'background': '#1A202C',
    'surface': '#2D3748',
    'on-primary': '#1A202C',
    'on-secondary': '#1A202C',
    'on-accent': '#1A202C',
    'on-surface': '#E2E8F0',
    'on-background': '#E2E8F0',
  },
}
