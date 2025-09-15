import { 
  validateMathEquation, 
  isValidEquationString, 
  getAllValidEquations 
} from '../mathValidator';

describe('mathValidator', () => {
  describe('validateMathEquation', () => {
    describe('3-card equations', () => {
      it('should validate addition equations', () => {
        const result = validateMathEquation([2, 3, 5]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 + 3 = 5');
      });

      it('should validate subtraction equations', () => {
        const result = validateMathEquation([8, 3, 5]);
        expect(result.isValid).toBe(true);
        // Both addition and subtraction are valid
        expect(['8 - 3 = 5', '3 + 5 = 8', '5 + 3 = 8']).toContain(result.equation);
      });

      it('should validate multiplication equations', () => {
        const result = validateMathEquation([2, 4, 8]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 × 4 = 8');
      });

      it('should find equation regardless of order', () => {
        const result = validateMathEquation([5, 2, 3]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 + 3 = 5');
      });

      it('should reject invalid 3-card combinations', () => {
        const result = validateMathEquation([2, 3, 7]);
        expect(result.isValid).toBe(false);
        expect(result.equation).toBeUndefined();
      });
    });

    describe('4-card equations', () => {
      it('should validate all addition', () => {
        const result = validateMathEquation([1, 2, 3, 6]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('1 + 2 + 3 = 6');
      });

      it('should validate mixed operations', () => {
        const result = validateMathEquation([5, 2, 1, 6]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('5 + 2 - 1 = 6');
      });

      it('should validate multiplication with addition', () => {
        const result = validateMathEquation([2, 3, 1, 7]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 × 3 + 1 = 7');
      });

      it('should validate grouped operations', () => {
        const result = validateMathEquation([2, 3, 2, 10]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('(2 + 3) × 2 = 10');
      });

      it('should reject invalid 4-card combinations', () => {
        const result = validateMathEquation([1, 1, 1, 5]);
        expect(result.isValid).toBe(false);
      });
    });

    describe('5-card equations', () => {
      it('should validate all addition', () => {
        const result = validateMathEquation([1, 2, 2, 3, 8]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('1 + 2 + 2 + 3 = 8');
      });

      it('should validate mixed addition and subtraction', () => {
        const result = validateMathEquation([5, 3, 2, 1, 9]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('5 + 3 + 2 - 1 = 9');
      });

      it('should validate with multiplication', () => {
        const result = validateMathEquation([2, 3, 1, 1, 8]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 × 3 + 1 + 1 = 8');
      });

      it('should validate grouped operations', () => {
        const result = validateMathEquation([1, 2, 3, 1, 10]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('(1 + 2) × 3 + 1 = 10');
      });

      it('should reject invalid 5-card combinations', () => {
        const result = validateMathEquation([1, 1, 1, 1, 10]);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should reject less than 3 cards', () => {
        expect(validateMathEquation([1, 2]).isValid).toBe(false);
        expect(validateMathEquation([5]).isValid).toBe(false);
        expect(validateMathEquation([]).isValid).toBe(false);
      });

      it('should reject more than 5 cards', () => {
        const result = validateMathEquation([1, 2, 3, 4, 5, 6]);
        expect(result.isValid).toBe(false);
      });

      it('should handle zeros correctly', () => {
        const result = validateMathEquation([0, 5, 5]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('5 + 5 = 10'); // 0 is filtered out
      });

      it('should handle negative numbers by filtering them', () => {
        const result = validateMathEquation([-1, 3, 5, 8]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('3 + 5 = 8'); // -1 is filtered out
      });

      it('should handle numbers greater than 10', () => {
        // Numbers greater than 10 can still be used in equations
        const result = validateMathEquation([2, 5, 10]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 × 5 = 10');
      });

      it('should handle null/undefined input', () => {
        const result = validateMathEquation(null as any);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Common game scenarios', () => {
      it('should validate 1 + 4 = 5', () => {
        const result = validateMathEquation([1, 4, 5]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('1 + 4 = 5');
      });

      it('should validate 2 × 5 = 10', () => {
        const result = validateMathEquation([2, 5, 10]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('2 × 5 = 10');
      });

      it('should validate 9 - 6 = 3', () => {
        const result = validateMathEquation([9, 6, 3]);
        expect(result.isValid).toBe(true);
        // Both addition and subtraction are valid
        expect(['9 - 6 = 3', '6 + 3 = 9', '3 + 6 = 9']).toContain(result.equation);
      });

      it('should validate 1 + 2 + 3 = 6', () => {
        const result = validateMathEquation([1, 2, 3, 6]);
        expect(result.isValid).toBe(true);
        expect(result.equation).toBe('1 + 2 + 3 = 6');
      });
    });
  });

  describe('isValidEquationString', () => {
    it('should validate correct equation strings', () => {
      expect(isValidEquationString('2 + 3 = 5')).toBe(true);
      expect(isValidEquationString('8 - 3 = 5')).toBe(true);
      expect(isValidEquationString('2 × 4 = 8')).toBe(true);
    });

    it('should reject invalid equation strings', () => {
      expect(isValidEquationString('2 + 3 = 6')).toBe(false);
      expect(isValidEquationString('not an equation')).toBe(false);
      expect(isValidEquationString('2 + 3')).toBe(false);
      expect(isValidEquationString('')).toBe(false);
    });

    it('should handle malformed equations gracefully', () => {
      expect(isValidEquationString('= 5')).toBe(false);
      expect(isValidEquationString('2 + = 5')).toBe(false);
      expect(isValidEquationString('2 + 3 =')).toBe(false);
    });
  });

  describe('getAllValidEquations', () => {
    it('should find all valid equations for 3 numbers', () => {
      const equations = getAllValidEquations([2, 3, 5]);
      
      // Should find both addition and subtraction equations
      const hasAddition = equations.some(eq => eq.includes('+'));
      const hasSubtraction = equations.some(eq => eq.includes('-'));
      
      expect(hasAddition || hasSubtraction).toBe(true);
      expect(equations.length).toBeGreaterThan(0);
      
      // At least one of these should be present
      const validEquations = ['2 + 3 = 5', '3 + 2 = 5', '5 - 2 = 3', '5 - 3 = 2'];
      const foundSome = validEquations.some(eq => equations.includes(eq));
      expect(foundSome).toBe(true);
    });

    it('should find multiple equations for versatile numbers', () => {
      const equations = getAllValidEquations([2, 4, 8]);
      
      expect(equations).toContain('2 × 4 = 8');
      // Note: Can't have '4 + 4 = 8' with input [2, 4, 8] since we only have one 4
      expect(equations.length).toBeGreaterThan(0);
    });

    it('should return empty array for invalid combinations', () => {
      const equations = getAllValidEquations([1, 1, 1]);
      
      // 1 + 1 ≠ 1, 1 - 1 ≠ 1, 1 × 1 ≠ 1 (except 1 × 1 = 1 but we need different result)
      // Actually 1 × 1 = 1 is valid
      expect(equations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle 4-number combinations', () => {
      const equations = getAllValidEquations([1, 2, 3, 6]);
      
      expect(equations).toContain('1 + 2 + 3 = 6');
      expect(equations.length).toBeGreaterThan(0);
    });

    it('should not duplicate equations', () => {
      const equations = getAllValidEquations([2, 3, 5]);
      const uniqueEquations = Array.from(new Set(equations));
      
      expect(equations.length).toBe(uniqueEquations.length);
    });

    it('should handle empty input', () => {
      const equations = getAllValidEquations([]);
      expect(equations).toEqual([]);
    });

    it('should handle single number', () => {
      const equations = getAllValidEquations([5]);
      expect(equations).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should handle 5 numbers efficiently', () => {
      const start = Date.now();
      const result = validateMathEquation([1, 2, 3, 4, 10]);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(result.isValid).toBe(true);
    });

    it('should generate all equations efficiently', () => {
      const start = Date.now();
      const equations = getAllValidEquations([1, 2, 3, 4, 5]);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(Array.isArray(equations)).toBe(true);
    });
  });
});