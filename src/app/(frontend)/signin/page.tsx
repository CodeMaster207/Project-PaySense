import { redirect } from 'next/navigation'
import { getAppUser } from '@/lib/app-auth'
import { SignInForm } from '@/components/SignInForm'

export default async function SignInPage() {
  if (await getAppUser()) redirect('/')
  return <SignInForm />
}
