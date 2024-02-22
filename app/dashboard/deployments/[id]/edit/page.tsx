import Form from '@/app/ui/deployments/edit-form';
import Breadcrumbs from '@/app/ui/deployments/breadcrumbs';
import { fetchDeploymentById, fetchCustomers } from '@/app/lib/data';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Deployments',
  };

export default async function Page({ params }: { params: { id: string } }) {
    const id = params.id;
    const [deployment, customers] = await Promise.all([
        fetchDeploymentById(id),
        fetchCustomers(),
      ]);

      if (!deployment) {
        notFound();
      }
      
    return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Deployments', href: '/dashboard/deployments' },
          {
            label: 'Edit Deployment',
            href: `/dashboard/deployments/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form deployment={deployment} customers={customers} />
    </main>
  );
}