'use client';

import { CustomerField, DeploymentForm } from '@/app/lib/definitions';
import {
  CheckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Button } from '@/app/ui/button';
import { updateDeployment } from '@/app/lib/actions';


export default function EditDeploymentForm({
  deployment,
  customers,
}: {
  deployment: DeploymentForm;
  customers: CustomerField[];
}) {
  const initialState = { message: null, errors: {} };
  const updateDeploymentWithId = updateDeployment.bind(null, deployment.id);
  const [state, dispatch] = useFormState(updateDeploymentWithId, initialState);
 
  return <form action={dispatch}></form>;
}
