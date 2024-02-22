import { unstable_noStore as noStore } from 'next/cache';

import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  DeploymentForm,
  DeploymentsTable,
  LatestDeploymentRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = await sql<Revenue>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestDeployments() {

  try {
    const data = await sql<LatestDeploymentRaw>`
      SELECT deployments.amount, customers.name, customers.image_url, customers.email, deployments.id
      FROM deployments
      JOIN customers ON deployments.customer_id = customers.id
      ORDER BY deployments.date DESC
      LIMIT 5`;

    const latestDeployments = data.rows.map((deployment) => ({
      ...deployment,
      amount: formatCurrency(deployment.amount),
    }));
    return latestDeployments;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest deployments.');
  }
}

export async function fetchCardData() {

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    const deploymentCountPromise = sql`SELECT COUNT(*) FROM deployments`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const deploymentStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM deployments`;

    const data = await Promise.all([
      deploymentCountPromise,
      customerCountPromise,
      deploymentStatusPromise,
    ]);

    const numberOfDeployments = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidDeployments = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingDeployments = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfDeployments,
      totalPaidDeployments,
      totalPendingDeployments,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredDeployments(

  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const deployments = await sql<DeploymentsTable>`
      SELECT
        deployments.id,
        deployments.amount,
        deployments.date,
        deployments.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM deployments
      JOIN customers ON deployments.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        deployments.amount::text ILIKE ${`%${query}%`} OR
        deployments.date::text ILIKE ${`%${query}%`} OR
        deployments.status ILIKE ${`%${query}%`}
      ORDER BY deployments.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return deployments.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch deployments.');
  }
}

export async function fetchDeploymentsPages(query: string) {

  try {
    const count = await sql`SELECT COUNT(*)
    FROM deployments
    JOIN customers ON deployments.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      deployments.amount::text ILIKE ${`%${query}%`} OR
      deployments.date::text ILIKE ${`%${query}%`} OR
      deployments.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of deployments.');
  }
}

export async function fetchDeploymentById(id: string) {

  try {
    const data = await sql<DeploymentForm>`
      SELECT
        deployments.id,
        deployments.customer_id,
        deployments.amount,
        deployments.status
      FROM deployments
      WHERE deployments.id = ${id};
    `;

    const deployment = data.rows.map((deployment) => ({
      ...deployment,
      // Convert amount from cents to dollars
      amount: deployment.amount / 100,
    }));

    return deployment[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch deployment.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(deployments.id) AS total_deployments,
		  SUM(CASE WHEN deployments.status = 'pending' THEN deployments.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN deployments.status = 'paid' THEN deployments.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN deployments ON customers.id = deployments.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
