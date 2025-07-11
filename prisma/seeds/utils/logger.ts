export const logger = {
    info: (message: string) => console.log(`ℹ️  ${message}`),
    success: (message: string) => console.log(`✅ ${message}`),
    warning: (message: string) => console.log(`⚠️  ${message}`),
    error: (message: string, error?: any) => {
      console.error(`❌ ${message}`);
      if (error) console.error(error);
    }
  };