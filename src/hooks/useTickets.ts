// File: useTickets.ts
// Path: src/hooks/useTickets.ts

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAxios } from '@/hooks/useAxios';
import type { Ticket, TicketCategory, TicketFilters, TicketMeta } from '@/types/ticket.types';

/** statuses + priorities + active categories — never hardcoded on the client */
export const useTicketMeta = () => {
  const axios = useAxios();
  const [meta, setMeta] = useState<TicketMeta | null>(null);

  useEffect(() => {
    let alive = true;
    axios
      .get('/tickets/meta')
      .then(res => alive && setMeta(res.data.data))
      .catch(() => alive && setMeta(null));
    return () => {
      alive = false;
    };
  }, [axios]);

  return meta;
};

export const useTickets = (filters: TicketFilters) => {
  const axios = useAxios();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(filters);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/tickets', {
        params: {
          page: filters.page,
          limit: filters.limit,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.status?.length ? { status: filters.status.join(',') } : {}),
          ...(filters.priority?.length ? { priority: filters.priority.join(',') } : {}),
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        },
      });
      setTickets(res.data.data ?? []);
      setTotal(res.data.meta?.total ?? 0);
      setTotalPages(res.data.meta?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axios, key]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, total, totalPages, loading, refetch: fetchTickets };
};

export const useTicketDetail = (id: string | null) => {
  const axios = useAxios();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTicket = useCallback(async () => {
    if (!id) {
      setTicket(null);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`/tickets/${id}`);
      setTicket(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [axios, id]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return { ticket, loading, refetch: fetchTicket };
};

export const useTicketCategories = (includeInactive = false) => {
  const axios = useAxios();
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/tickets/categories', {
        params: { includeInactive },
      });
      setCategories(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [axios, includeInactive]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, loading, refetch: fetchCategories };
};

/** mutations — call inside components, they use the same instance */
export const useTicketActions = () => {
  const axios = useAxios();

  const createTicket = async (payload: Record<string, string | undefined>, files: File[]) => {
    const form = new FormData();
    Object.entries(payload).forEach(([k, v]) => {
      if (v) form.append(k, v);
    });
    files.forEach(f => form.append('files', f));

    const res = await axios.post('/tickets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as Ticket;
  };

  const updateTicket = async (id: string, payload: Record<string, unknown>) => {
    const res = await axios.patch(`/tickets/${id}`, payload);
    return res.data.data as Ticket;
  };

  const addAttachments = async (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    const res = await axios.post(`/tickets/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  };

  const deleteAttachment = (ticketId: string, attachmentId: string) =>
    axios.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);

  const createCategory = async (name: string) => {
    const res = await axios.post('/tickets/categories', { name });
    return res.data.data as TicketCategory;
  };

  const updateCategory = async (id: string, payload: { name?: string; isActive?: boolean }) => {
    const res = await axios.patch(`/tickets/categories/${id}`, payload);
    return res.data.data as TicketCategory;
  };

  return {
    createTicket,
    updateTicket,
    addAttachments,
    deleteAttachment,
    createCategory,
    updateCategory,
  };
};
