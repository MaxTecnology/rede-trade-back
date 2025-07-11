export class FakerUtils {
  static cpf(): string {
    const numbers = Array.from({length: 9}, () => Math.floor(Math.random() * 10));
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += numbers[i] * (10 - i);
    }
    const firstDigit = ((sum * 10) % 11) % 10;
    numbers.push(firstDigit);
    
    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += numbers[i] * (11 - i);
    }
    const secondDigit = ((sum * 10) % 11) % 10;
    numbers.push(secondDigit);
    
    return numbers.join('');
  }

  static cnpj(): string {
    const numbers = Array.from({length: 12}, () => Math.floor(Math.random() * 10));
    
    // Calcular primeiro dígito verificador
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += numbers[i] * weights1[i];
    }
    const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    numbers.push(firstDigit);
    
    // Calcular segundo dígito verificador
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += numbers[i] * weights2[i];
    }
    const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    numbers.push(secondDigit);
    
    return numbers.join('');
  }

  static cep(): string {
    return String(Math.floor(Math.random() * 90000000) + 10000000).replace(/(\d{5})(\d{3})/, '$1-$2');
  }

  static phone(): string {
    const ddd = Math.floor(Math.random() * 89) + 11;
    const number = Math.floor(Math.random() * 900000000) + 100000000;
    return `${ddd}${number}`;
  }

  static randomFromArray<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomFloat(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }

  static futureDate(daysFromNow: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  }
}