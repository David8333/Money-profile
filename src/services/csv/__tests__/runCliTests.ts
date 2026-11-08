import { runAllCsvAcceptanceTests } from './csvTestSuite';

async function main() {
  console.log('=== 開始執行 Phase 2 CSV 引擎自動化測試 ===\n');
  const outcome = await runAllCsvAcceptanceTests();

  outcome.results.forEach((r, idx) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${idx + 1}] ${symbol}: ${r.name}`);
    console.log(`    說明: ${r.message}`);
    console.log(`    耗時: ${r.durationMs.toFixed(2)} ms\n`);
  });

  console.log('-------------------------------------------');
  console.log(`測試結果摘要: 共 ${outcome.summary.total} 項，通過: ${outcome.summary.passed}，失敗: ${outcome.summary.failed}`);
  console.log('-------------------------------------------');

  if (!outcome.allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('測試執行異常:', err);
  process.exit(1);
});
