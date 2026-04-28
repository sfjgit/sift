'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAxios } from '@/hooks/useAxios';
// import useAxios from '@/hooks/useAxios';

export default function ClientListPage() {
  const router = useRouter();
  const axios = useAxios();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, status, page }],
    queryFn: async () => {
      const res = await axios.get('/clients', {
        params: {
          search,
          status,
          page,
          limit: 10,
        },
      });
      return res.data;
    },
    staleTime: 60 * 1000 * 5,
    // keepPreviousData: true,
  });

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <Select onValueChange={val => setStatus(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setPage(1)}>Apply</Button>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Loading...</TableCell>
                </TableRow>
              ) : (
                data?.data?.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.status}</TableCell>
                    <TableCell>{client.category || '-'}</TableCell>
                    <TableCell>{client._count?.requirements}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/clients/${client.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex justify-between items-center">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>

            <span>Page {page}</span>

            <Button
              variant="outline"
              disabled={data?.data?.length < 10}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
