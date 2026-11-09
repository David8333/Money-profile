import { runAllCfoAcceptanceTests } from './cfoTestSuite';

async function main() {
  console.log('=== 開始執行 Personal CFO 財務經營中心自動化驗收測試 ===\n');
  const summary = await runAllCfoAcceptanceTests();

  summary.results.forEach((r) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${r.id}] ${symbol}: ${r.title}`);
    console.log(`    說明: ${r.message}`);
    console.log(`    耗時: ${r.durationMs} ms\n`);
  });

  console.log('----------------------------------------------------');
  console.log(`Personal CFO 驗收結果: 共 ${summary.total} 項，通過: ${summary.passed}，失敗: ${summary.failed}`);
  console.log('----------------------------------------------------');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('執行 CFO 測試時發生未捕獲異常:', err);
  process.exit(1);
});
