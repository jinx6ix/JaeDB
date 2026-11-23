'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AgentForm from '@/components/AgentForm';

export default function EditAgentPage() {
  const { id } = useParams() as { id: string };
  const [agent, setAgent] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/agents/${id}`).then(r => r.json()).then(setAgent);
  }, [id]);

  if (!agent) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      <AgentForm agentId={id} initial={agent} />
      {agent.clients?.length > 0 && (
        <div className="max-w-xl card space-y-3">
          <h2 className="font-semibold text-gray-800">Clients from this agent ({agent.clients.length})</h2>
          <div className="divide-y divide-gray-100">
            {agent.clients.map((c: any) => (
              <div key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email || c.phone || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
