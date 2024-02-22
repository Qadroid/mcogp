'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';


const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
        .number()
        .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'],  {   
        invalid_type_error: 'Please select an deployment status.',
}),
    date: z.string(),
  });

  const UpdateDeployment = FormSchema.omit({ id: true, date: true });
  const CreateDeployment = FormSchema.omit({ id: true, date: true });

  export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };
   
  export async function createDeployment(prevState: State, formData: FormData) {
    // Validate form using Zod
    const validatedFields = CreateDeployment.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    // If form validation fails, return errors early. Otherwise, continue.
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Deployment.',
      };
    }
   
    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];
   
    // Insert data into the database
    try {
      await sql`
        INSERT INTO deployments (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
      // If a database error occurs, return a more specific error.
      return {
        message: 'Database Error: Failed to Create Deployment.',
      };
    }
   
    // Revalidate the cache for the deployments page and redirect the user.
    revalidatePath('/dashboard/deployments');
    redirect('/dashboard/deployments');
  }

  export async function updateDeployment(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    const validatedFields = UpdateDeployment.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Deployment.',
      };
    }
   
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
   
    try {
      await sql`
        UPDATE deployments
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
    } catch (error) {
      return { message: 'Database Error: Failed to Update Deployment.' };
    }
   
    revalidatePath('/dashboard/deployments');
    redirect('/dashboard/deployments');
  }

  export async function deleteDeployment(id: string) {
    try {
      await sql`DELETE FROM deployments WHERE id = ${id}`;
      revalidatePath('/dashboard/deployments');
      return { message: 'Deleted Deployment.' };
    } catch (error) {
      return { message: 'Database Error: Failed to Delete Deployment.' };
    }
  }

  export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }