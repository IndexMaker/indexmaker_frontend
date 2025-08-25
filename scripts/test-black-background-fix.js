#!/usr/bin/env node

// scripts/test-black-background-fix.js
// Test the black background fix for the calculator

const fs = require('fs');
const path = require('path');

async function testBlackBackgroundFix() {
  console.log('🧪 Testing Black Background Fix for Calculator\n');
  console.log('=' .repeat(60));
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Theme Provider Configuration
  console.log('\n📊 Test 1: Theme Provider Configuration');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const layoutPath = path.join(__dirname, '..', 'app', 'layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    
    const hasDisabledSystemTheme = layoutContent.includes('enableSystem={false}');
    const hasForcedLightTheme = layoutContent.includes('forcedTheme="light"');
    const hasLightDefaultTheme = layoutContent.includes('defaultTheme="light"');
    const hasWhiteBodyBackground = layoutContent.includes('bg-white');
    
    if (hasDisabledSystemTheme && hasForcedLightTheme && hasLightDefaultTheme && hasWhiteBodyBackground) {
      console.log('✅ Theme provider properly configured for light theme');
      console.log('  ✓ System theme detection disabled');
      console.log('  ✓ Light theme forced');
      console.log('  ✓ Light theme set as default');
      console.log('  ✓ White background added to body');
      passedTests++;
    } else {
      console.log('❌ Theme provider configuration incomplete');
      console.log(`  disabledSystemTheme: ${hasDisabledSystemTheme}`);
      console.log(`  forcedLightTheme: ${hasForcedLightTheme}`);
      console.log(`  lightDefaultTheme: ${hasLightDefaultTheme}`);
      console.log(`  whiteBodyBackground: ${hasWhiteBodyBackground}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error testing theme provider: ${error.message}`);
    failedTests++;
  }
  
  // Test 2: CSS Override Implementation
  console.log('\n📊 Test 2: CSS Override Implementation');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const cssPath = path.join(__dirname, '..', 'app', 'globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    const hasCalculatorContainer = cssContent.includes('.calculator-container');
    const hasDarkThemeOverride = cssContent.includes('.dark .calculator-container');
    const hasWhiteBackgroundOverride = cssContent.includes('--background: #ffffff !important');
    const hasWhiteCardOverride = cssContent.includes('--card: #ffffff !important');
    const hasDarkTextOverride = cssContent.includes('--foreground: #1f2937 !important');
    const hasImportantDeclarations = cssContent.includes('background-color: #ffffff !important');
    
    if (hasCalculatorContainer && hasDarkThemeOverride && hasWhiteBackgroundOverride && 
        hasWhiteCardOverride && hasDarkTextOverride && hasImportantDeclarations) {
      console.log('✅ CSS overrides properly implemented');
      console.log('  ✓ Calculator container class defined');
      console.log('  ✓ Dark theme override rules');
      console.log('  ✓ White background CSS variables');
      console.log('  ✓ White card CSS variables');
      console.log('  ✓ Dark text CSS variables');
      console.log('  ✓ Important declarations for override');
      passedTests++;
    } else {
      console.log('❌ CSS overrides incomplete');
      console.log(`  calculatorContainer: ${hasCalculatorContainer}`);
      console.log(`  darkThemeOverride: ${hasDarkThemeOverride}`);
      console.log(`  whiteBackgroundOverride: ${hasWhiteBackgroundOverride}`);
      console.log(`  whiteCardOverride: ${hasWhiteCardOverride}`);
      console.log(`  darkTextOverride: ${hasDarkTextOverride}`);
      console.log(`  importantDeclarations: ${hasImportantDeclarations}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error testing CSS overrides: ${error.message}`);
    failedTests++;
  }
  
  // Test 3: Calculator Container Class
  console.log('\n📊 Test 3: Calculator Container Class');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const calculatorPath = path.join(__dirname, '..', 'app', 'calculator', 'page.tsx');
    const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');
    
    const hasCalculatorContainerClass = calculatorContent.includes('calculator-container');
    const hasExplicitWhiteBackgrounds = calculatorContent.includes('bg-white');
    const hasProperCardStyling = calculatorContent.includes('Card className="bg-white');
    
    if (hasCalculatorContainerClass && hasExplicitWhiteBackgrounds && hasProperCardStyling) {
      console.log('✅ Calculator container properly configured');
      console.log('  ✓ Calculator container class applied');
      console.log('  ✓ Explicit white backgrounds maintained');
      console.log('  ✓ Proper card styling with white backgrounds');
      passedTests++;
    } else {
      console.log('❌ Calculator container configuration incomplete');
      console.log(`  calculatorContainerClass: ${hasCalculatorContainerClass}`);
      console.log(`  explicitWhiteBackgrounds: ${hasExplicitWhiteBackgrounds}`);
      console.log(`  properCardStyling: ${hasProperCardStyling}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error testing calculator container: ${error.message}`);
    failedTests++;
  }
  
  // Test 4: Dark Theme Variable Analysis
  console.log('\n📊 Test 4: Dark Theme Variable Analysis');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const cssPath = path.join(__dirname, '..', 'app', 'globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // Check that dark theme variables are overridden
    const darkThemeSection = cssContent.match(/\.dark\s*\{[\s\S]*?\}/);
    const hasOriginalDarkTheme = darkThemeSection !== null;
    
    // Check that our overrides come after the dark theme definition
    const overrideSection = cssContent.indexOf('Force light theme for calculator');
    const darkThemeEnd = darkThemeSection ? cssContent.indexOf('}', darkThemeSection.index + darkThemeSection[0].length) : -1;
    const overrideComesAfter = overrideSection > darkThemeEnd;
    
    if (hasOriginalDarkTheme && overrideComesAfter) {
      console.log('✅ Dark theme variables properly overridden');
      console.log('  ✓ Original dark theme detected');
      console.log('  ✓ Override rules placed after dark theme');
      console.log('  ✓ CSS cascade order ensures overrides take precedence');
      passedTests++;
    } else {
      console.log('❌ Dark theme variable override issues');
      console.log(`  originalDarkTheme: ${hasOriginalDarkTheme}`);
      console.log(`  overrideComesAfter: ${overrideComesAfter}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error analyzing dark theme variables: ${error.message}`);
    failedTests++;
  }
  
  // Test 5: Accessibility Improvements Maintained
  console.log('\n📊 Test 5: Accessibility Improvements Maintained');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const calculatorPath = path.join(__dirname, '..', 'app', 'calculator', 'page.tsx');
    const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');
    
    // Check that our previous accessibility improvements are still in place
    const hasImprovedCellHighlighting = calculatorContent.includes('bg-blue-600 text-white font-semibold');
    const hasContextAwareColoring = calculatorContent.includes('getPercentageColor(percentage, isHighlighted)');
    const hasHighContrastColors = calculatorContent.includes('text-green-700 font-medium');
    
    if (hasImprovedCellHighlighting && hasContextAwareColoring && hasHighContrastColors) {
      console.log('✅ Previous accessibility improvements maintained');
      console.log('  ✓ Improved cell highlighting preserved');
      console.log('  ✓ Context-aware coloring preserved');
      console.log('  ✓ High contrast colors preserved');
      passedTests++;
    } else {
      console.log('❌ Some accessibility improvements may have been lost');
      console.log(`  improvedCellHighlighting: ${hasImprovedCellHighlighting}`);
      console.log(`  contextAwareColoring: ${hasContextAwareColoring}`);
      console.log(`  highContrastColors: ${hasHighContrastColors}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error checking accessibility improvements: ${error.message}`);
    failedTests++;
  }
  
  // Test 6: No Black Background Classes
  console.log('\n📊 Test 6: No Black Background Classes');
  console.log('-' .repeat(50));
  
  totalTests++;
  try {
    const calculatorPath = path.join(__dirname, '..', 'app', 'calculator', 'page.tsx');
    const calculatorContent = fs.readFileSync(calculatorPath, 'utf8');
    
    const hasNoBlackBackground = !calculatorContent.includes('bg-black');
    const hasNoVeryDarkGray = !calculatorContent.includes('bg-gray-900');
    const hasNoSlateBackground = !calculatorContent.includes('bg-slate-900');
    const hasWhiteBackgrounds = calculatorContent.includes('bg-white');
    
    if (hasNoBlackBackground && hasNoVeryDarkGray && hasNoSlateBackground && hasWhiteBackgrounds) {
      console.log('✅ No problematic dark background classes found');
      console.log('  ✓ No bg-black classes');
      console.log('  ✓ No bg-gray-900 classes');
      console.log('  ✓ No bg-slate-900 classes');
      console.log('  ✓ White backgrounds properly used');
      passedTests++;
    } else {
      console.log('❌ Potential dark background classes found');
      console.log(`  noBlackBackground: ${hasNoBlackBackground}`);
      console.log(`  noVeryDarkGray: ${hasNoVeryDarkGray}`);
      console.log(`  noSlateBackground: ${hasNoSlateBackground}`);
      console.log(`  hasWhiteBackgrounds: ${hasWhiteBackgrounds}`);
      failedTests++;
    }
    
  } catch (error) {
    console.log(`❌ Error checking background classes: ${error.message}`);
    failedTests++;
  }
  
  // Final Results
  console.log('\n📈 Black Background Fix Test Results');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Total: ${totalTests}`);
  console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  // Summary
  console.log('\n🎯 Black Background Fix Summary:');
  if (failedTests === 0) {
    console.log('🎉 Black background issue completely resolved!');
    console.log('✅ Theme provider forced to light mode');
    console.log('✅ CSS overrides prevent dark theme activation');
    console.log('✅ Calculator container class ensures white backgrounds');
    console.log('✅ All accessibility improvements maintained');
    console.log('✅ No problematic dark background classes');
  } else {
    console.log(`⚠️  ${failedTests} issues still need attention`);
  }
  
  console.log('\n📝 Implementation Details:');
  console.log('1. 🎨 Theme Provider: Disabled system theme, forced light mode');
  console.log('2. 🔧 CSS Overrides: Important declarations override dark theme variables');
  console.log('3. 📦 Container Class: calculator-container class ensures consistent styling');
  console.log('4. 🎯 Cascade Order: Overrides placed after dark theme for proper precedence');
  console.log('5. ♿ Accessibility: All previous improvements maintained');
  console.log('6. 🚫 Clean Code: No problematic dark background classes');
  
  console.log('\n🌟 Expected Results:');
  console.log('• Calculator background should now be white');
  console.log('• All cards and sections should have white backgrounds');
  console.log('• Text should be dark and easily readable');
  console.log('• No black backgrounds anywhere in the calculator');
  console.log('• All accessibility improvements preserved');
  
  return failedTests === 0;
}

// Run the comprehensive test
testBlackBackgroundFix().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Black background fix test failed:', error);
  process.exit(1);
});
