import Form from '@/app/ui/deployments/create-form';
import Breadcrumbs from '@/app/ui/deployments/breadcrumbs';
import { fetchCustomers } from '@/app/lib/data';
 
export default async function Page() {
  const customers = await fetchCustomers();
 
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Deployments', href: '/dashboard/deployments' },
          {
            label: 'Create Deployment',
            href: '/dashboard/deployments/create',
            active: true,
          },
        ]}
      />
      <Form customers={customers} />
    </main>
  );
}