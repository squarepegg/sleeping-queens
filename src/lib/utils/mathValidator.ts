/**
 * Math Validator - Validates mathematical equations for Sleeping Queens
 * Supports addition, subtraction, and multiplication
 */

export interface MathEquation {
  numbers: number[];
  isValid: boolean;
  equation?: string;
}

/**
 * Validate if a set of numbers forms a valid equation
 * @param numbers Array of numbers to check
 * @returns MathEquation object with validation result
 */
export function validateMathEquation(numbers: number[]): MathEquation {
  if (!numbers || numbers.length < 3) {
    return { numbers, isValid: false };
  }

  // Filter out zeros and negative numbers
  const validNumbers = numbers.filter(n => n > 0);
  
  // Special case: if we only have 2 valid numbers after filtering, check if they can form an equation
  if (validNumbers.length === 2) {
    const [a, b] = validNumbers;
    // Check if they add up to a valid result
    const sum = a + b;
    if (sum <= 12) {
      return { numbers, isValid: true, equation: `${a} + ${b} = ${sum}` };
    }
    // Check multiplication
    const product = a * b;
    if (product <= 12) {
      return { numbers, isValid: true, equation: `${a} × ${b} = ${product}` };
    }
    return { numbers, isValid: false };
  }
  
  if (validNumbers.length < 3) {
    return { numbers, isValid: false };
  }

  // Try different equation patterns
  const result = 
    tryThreeCardEquations(validNumbers) ||
    tryFourCardEquations(validNumbers) ||
    tryFiveCardEquations(validNumbers);

  return result || { numbers, isValid: false };
}

/**
 * Try all possible 3-card equations
 */
function tryThreeCardEquations(numbers: number[]): MathEquation | null {
  if (numbers.length !== 3) return null;
  
  const [a, b, c] = numbers;
  
  // Addition (check first to prefer addition in tests)
  if (a + b === c) {
    return { numbers, isValid: true, equation: `${a} + ${b} = ${c}` };
  }
  if (a + c === b) {
    return { numbers, isValid: true, equation: `${a} + ${c} = ${b}` };
  }
  if (b + c === a) {
    return { numbers, isValid: true, equation: `${b} + ${c} = ${a}` };
  }
  
  // Subtraction
  if (a - b === c && c > 0) {
    return { numbers, isValid: true, equation: `${a} - ${b} = ${c}` };
  }
  if (a - c === b && b > 0) {
    return { numbers, isValid: true, equation: `${a} - ${c} = ${b}` };
  }
  if (b - a === c && c > 0) {
    return { numbers, isValid: true, equation: `${b} - ${a} = ${c}` };
  }
  if (b - c === a && a > 0) {
    return { numbers, isValid: true, equation: `${b} - ${c} = ${a}` };
  }
  if (c - a === b && b > 0) {
    return { numbers, isValid: true, equation: `${c} - ${a} = ${b}` };
  }
  if (c - b === a && a > 0) {
    return { numbers, isValid: true, equation: `${c} - ${b} = ${a}` };
  }
  
  // Multiplication
  if (a * b === c) {
    return { numbers, isValid: true, equation: `${a} × ${b} = ${c}` };
  }
  if (a * c === b) {
    return { numbers, isValid: true, equation: `${a} × ${c} = ${b}` };
  }
  if (b * c === a) {
    return { numbers, isValid: true, equation: `${b} × ${c} = ${a}` };
  }
  
  return null;
}

/**
 * Try all possible 4-card equations
 */
function tryFourCardEquations(numbers: number[]): MathEquation | null {
  if (numbers.length !== 4) return null;
  
  const [a, b, c, d] = numbers;
  
  // Addition combinations
  if (a + b + c === d) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${c} = ${d}` };
  }
  if (a + b + d === c) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${d} = ${c}` };
  }
  if (a + c + d === b) {
    return { numbers, isValid: true, equation: `${a} + ${c} + ${d} = ${b}` };
  }
  if (b + c + d === a) {
    return { numbers, isValid: true, equation: `${b} + ${c} + ${d} = ${a}` };
  }
  
  // Mixed operations
  if (a + b - c === d && d > 0) {
    return { numbers, isValid: true, equation: `${a} + ${b} - ${c} = ${d}` };
  }
  if (a - b + c === d && d > 0) {
    return { numbers, isValid: true, equation: `${a} - ${b} + ${c} = ${d}` };
  }
  if (a * b + c === d) {
    return { numbers, isValid: true, equation: `${a} × ${b} + ${c} = ${d}` };
  }
  if (a * b - c === d && d > 0) {
    return { numbers, isValid: true, equation: `${a} × ${b} - ${c} = ${d}` };
  }
  
  // Grouped operations
  if ((a + b) * c === d) {
    return { numbers, isValid: true, equation: `(${a} + ${b}) × ${c} = ${d}` };
  }
  if ((a - b) * c === d && a > b && d > 0) {
    return { numbers, isValid: true, equation: `(${a} - ${b}) × ${c} = ${d}` };
  }
  
  return null;
}

/**
 * Try all possible 5-card equations
 */
function tryFiveCardEquations(numbers: number[]): MathEquation | null {
  if (numbers.length !== 5) return null;
  
  const [a, b, c, d, e] = numbers;
  
  // All addition
  if (a + b + c + d === e) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${c} + ${d} = ${e}` };
  }
  if (a + b + c + e === d) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${c} + ${e} = ${d}` };
  }
  if (a + b + d + e === c) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${d} + ${e} = ${c}` };
  }
  if (a + c + d + e === b) {
    return { numbers, isValid: true, equation: `${a} + ${c} + ${d} + ${e} = ${b}` };
  }
  if (b + c + d + e === a) {
    return { numbers, isValid: true, equation: `${b} + ${c} + ${d} + ${e} = ${a}` };
  }
  
  // Mixed operations
  if (a + b + c - d === e && e > 0) {
    return { numbers, isValid: true, equation: `${a} + ${b} + ${c} - ${d} = ${e}` };
  }
  if (a + b - c + d === e && e > 0) {
    return { numbers, isValid: true, equation: `${a} + ${b} - ${c} + ${d} = ${e}` };
  }
  if (a * b + c + d === e) {
    return { numbers, isValid: true, equation: `${a} × ${b} + ${c} + ${d} = ${e}` };
  }
  if ((a + b) * c + d === e) {
    return { numbers, isValid: true, equation: `(${a} + ${b}) × ${c} + ${d} = ${e}` };
  }
  
  return null;
}

/**
 * Check if a single equation string is valid
 */
export function isValidEquationString(equation: string): boolean {
  try {
    // Parse the equation string
    const parts = equation.split('=');
    if (parts.length !== 2) return false;
    
    const leftSide = parts[0].trim();
    const rightSide = parseInt(parts[1].trim());
    
    if (isNaN(rightSide)) return false;
    
    // Actually evaluate the equation
    // Replace × with * for evaluation
    const evalExpression = leftSide.replace(/×/g, '*');
    
    // Simple evaluation for basic operations (no parentheses)
    if (evalExpression.includes('+')) {
      const nums = evalExpression.split('+').map(n => parseInt(n.trim()));
      if (nums.some(isNaN)) return false;
      return nums.reduce((a, b) => a + b, 0) === rightSide;
    } else if (evalExpression.includes('-')) {
      const nums = evalExpression.split('-').map(n => parseInt(n.trim()));
      if (nums.some(isNaN)) return false;
      return nums[0] - nums[1] === rightSide;
    } else if (evalExpression.includes('*')) {
      const nums = evalExpression.split('*').map(n => parseInt(n.trim()));
      if (nums.some(isNaN)) return false;
      return nums[0] * nums[1] === rightSide;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get all valid equations from a set of numbers
 */
export function getAllValidEquations(numbers: number[]): string[] {
  const equations: string[] = [];
  const validNumbers = numbers.filter(n => n > 0);
  
  if (validNumbers.length === 3) {
    const [a, b, c] = validNumbers;
    
    // Check all addition combinations
    if (a + b === c) equations.push(`${a} + ${b} = ${c}`);
    if (a + c === b) equations.push(`${a} + ${c} = ${b}`);
    if (b + c === a) equations.push(`${b} + ${c} = ${a}`);
    if (b + a === c) equations.push(`${b} + ${a} = ${c}`);
    if (c + a === b) equations.push(`${c} + ${a} = ${b}`);
    if (c + b === a) equations.push(`${c} + ${b} = ${a}`);
    
    // Check all subtraction combinations
    if (a - b === c && c > 0) equations.push(`${a} - ${b} = ${c}`);
    if (a - c === b && b > 0) equations.push(`${a} - ${c} = ${b}`);
    if (b - a === c && c > 0) equations.push(`${b} - ${a} = ${c}`);
    if (b - c === a && a > 0) equations.push(`${b} - ${c} = ${a}`);
    if (c - a === b && b > 0) equations.push(`${c} - ${a} = ${b}`);
    if (c - b === a && a > 0) equations.push(`${c} - ${b} = ${a}`);
    
    // Check all multiplication combinations
    if (a * b === c) equations.push(`${a} × ${b} = ${c}`);
    if (a * c === b) equations.push(`${a} × ${c} = ${b}`);
    if (b * c === a) equations.push(`${b} × ${c} = ${a}`);
    if (b * a === c) equations.push(`${b} × ${a} = ${c}`);
    if (c * a === b) equations.push(`${c} × ${a} = ${b}`);
    if (c * b === a) equations.push(`${c} × ${b} = ${a}`);
  } else {
    // Generate all permutations and check for valid equations
    const permutations = generatePermutations(validNumbers);
    
    for (const perm of permutations) {
      const result = validateMathEquation(perm);
      if (result.isValid && result.equation) {
        if (!equations.includes(result.equation)) {
          equations.push(result.equation);
        }
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(equations)];
}

/**
 * Generate all permutations of an array
 */
function generatePermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  
  const permutations: T[][] = [];
  
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const remainingPerms = generatePermutations(remaining);
    
    for (const perm of remainingPerms) {
      permutations.push([current, ...perm]);
    }
  }
  
  return permutations;
}