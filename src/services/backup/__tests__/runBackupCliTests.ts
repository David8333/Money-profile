import { runAllPhase6bAcceptanceTests } from './backupTestSuite';

async function main() {
  console.log('=== 開始執行 Phase 6B JSON 資料備份與還原自動化測試 ===\n');
  const outcome = await runAllPhase6bAcceptanceTests();

  outcome.results.forEach((r, idx) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${idx + 1}] ${symbol}: ${r.name}`);
    console.log(`    說明: ${r.message}`);
    console.log(`    耗時: ${r.durationMs.toFixed(2)} ms\n`);
  });

  console.log('----------------------------------------------------');
  console.log(`Phase 6B 驗收結果: 共 ${outcome.total} 項，通過: ${outcome.passed}，失敗: ${outcome.failed}`);
  console.log('----------------------------------------------------');

  if (!outcome.allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Phase 6B 測試執行異常:', err);
  process.exit(1);
});
