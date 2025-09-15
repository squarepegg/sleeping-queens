import { ACTION_CARDS } from '../cards';

describe('Named Kings Feature', () => {
  test('should have 8 uniquely named Kings matching Sleeping Queens game', () => {
    const kings = ACTION_CARDS.filter(card => card.type === 'king');
    
    // Should have exactly 8 kings
    expect(kings).toHaveLength(8);
    
    // Expected King names from the real Sleeping Queens game
    const expectedKingNames = [
      'Bubble Gum King',
      'Chess King', 
      'Cookie King',
      'Fire King',
      'Hat King',
      'Puzzle King',
      'Tie-Dye King',
      'Turtle King'
    ];
    
    // Check that all expected names are present
    const actualKingNames = kings.map(king => king.name).sort();
    const sortedExpectedNames = expectedKingNames.sort();
    
    console.log('=== NAMED KINGS TEST ===');
    console.log('Expected King names:', sortedExpectedNames);
    console.log('Actual King names:', actualKingNames);
    
    expect(actualKingNames).toEqual(sortedExpectedNames);
    
    // Check that each King has the correct properties
    kings.forEach((king, index) => {
      expect(king.type).toBe('king');
      expect(king.id).toBe(`king-${index + 1}`);
      expect(king.description).toBe('Wake up a sleeping queen');
      expect(expectedKingNames).toContain(king.name);
    });
    
    // Verify no duplicate names
    const nameSet = new Set(kings.map(k => k.name));
    expect(nameSet.size).toBe(8);
    
    // Verify all names are different from generic "King"
    kings.forEach(king => {
      expect(king.name).not.toBe('King');
      expect(king.name?.includes('King')).toBe(true); // Should still contain "King"
    });
  });

  test('should display King names correctly in discard pile', () => {
    const kings = ACTION_CARDS.filter(card => card.type === 'king');
    
    // Test each King name display
    kings.forEach(king => {
      console.log(`Testing King: ${king.name} (${king.id})`);
      
      // Simulate how the discard pile displays names
      const displayName = king.name || king.type;
      
      expect(displayName).toBe(king.name);
      expect(displayName).not.toBe('King');
      expect(displayName).not.toBe('king');
      
      // Should be a proper descriptive name
      expect(displayName.length).toBeGreaterThan(4);
      expect(displayName.includes('King')).toBe(true);
    });
  });

  test('should have proper King IDs and types', () => {
    const kings = ACTION_CARDS.filter(card => card.type === 'king');
    
    console.log('=== KING IDS AND TYPES ===');
    kings.forEach((king, index) => {
      console.log(`${king.id}: ${king.name}`);
      
      expect(king.id).toBe(`king-${index + 1}`);
      expect(king.type).toBe('king');
    });
    
    // Ensure IDs are sequential and unique
    const expectedIds = Array.from({ length: 8 }, (_, i) => `king-${i + 1}`);
    const actualIds = kings.map(k => k.id).sort();
    
    expect(actualIds).toEqual(expectedIds);
  });
});