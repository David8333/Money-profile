import { runPhase6aConsistencyTests } from './phase6aTestSuite';

async function main() {
  console.log('=== 開始執行 Phase 6A 財務資料一致性驗證自動化測試 ===\n');
  const outcome = await runPhase6aConsistencyTests();

  outcome.results.forEach((r, idx) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${idx + 1}] ${symbol}: ${r.name}`);
    console.log(`    說明: ${r.message}`);
    console.log(`    耗時: ${r.durationMs.toFixed(2)} ms\n`);
  });

  console.log('----------------------------------------------------');
  console.log(`Phase 6A 驗收結果: 共 ${outcome.total} 項，通過: ${outcome.passed}，失敗: ${outcome.failed}`);
  console.log('----------------------------------------------------');

  if (!outcome.allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Phase 6A 測試執行異常:', err);
  process.exit(1);
});
