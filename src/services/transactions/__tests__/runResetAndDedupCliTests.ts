import { runAllResetAndDedupTests } from './resetAndDedupTestSuite';

async function main() {
  console.log('=== 開始執行 CSV 去重防疊加與全部記帳重置驗收測試 ===\n');
  const summary = await runAllResetAndDedupTests();

  summary.results.forEach((r) => {
    const symbol = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${r.id}] ${symbol}: ${r.title}`);
    console.log(`    說明: ${r.message}`);
    console.log(`    耗時: ${r.durationMs} ms\n`);
  });

  console.log('----------------------------------------------------');
  console.log(`驗收結果: 共 ${summary.total} 項，通過: ${summary.passed}，失敗: ${summary.failed}`);
  console.log('----------------------------------------------------');

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('執行重置與去重測試時發生未捕獲異常:', err);
  process.exit(1);
});
