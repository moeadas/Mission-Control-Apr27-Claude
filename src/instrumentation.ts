export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { recoverExecutionJobs } = await import('@/lib/server/execution-queue')
  await recoverExecutionJobs()
}
