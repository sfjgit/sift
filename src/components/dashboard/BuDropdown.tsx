// components/BuDropdown.tsx
import { useAxios } from '@/hooks/useAxios';
import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
} from '@/components/ui/select';

// ---- Types ----
interface BusinessUnit {
  id: string;
  name: string;
  isActive: boolean;
  parentBUId: string | null;
  parentBU: BusinessUnit | null;
  childBUs: BusinessUnit[];
}

// ---- Flatten tree → flat list with depth ----
interface FlatBU {
  id: string;
  name: string;
  isActive: boolean;
  depth: number;
}

function flattenBUs(units: BusinessUnit[], depth = 0): FlatBU[] {
  return units.flatMap(unit => [
    { id: unit.id, name: unit.name, isActive: unit.isActive, depth },
    ...flattenBUs(unit.childBUs ?? [], depth + 1),
  ]);
}

// ---- Component ----
interface BuDropdownProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function BuDropdown({
  value,
  onChange,
  placeholder = 'Select a business unit',
}: BuDropdownProps) {
  const api = useAxios();

  const { data, isLoading, isError } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await api.get('/business-units');
      return res.data.data;
    },
  });

  // Only show root-level BUs (no parentBUId) — childBUs are nested inside
  const rootUnits = data?.filter(bu => bu.parentBUId === null) ?? [];
  const flatList = flattenBUs(rootUnits);

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={isLoading ? 'Loading...' : isError ? 'Failed to load' : placeholder}
        />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={undefined}>
          <span>
            <>Business Units</>
          </span>
          {/* <SelectLabel>Business Units</SelectLabel>

           */}
        </SelectItem>
        {flatList.map(bu => (
          <SelectItem
            key={bu.id}
            value={bu.id}
            disabled={!bu.isActive}
            className={
              bu.depth === 1
                ? 'pl-6 text-muted-foreground'
                : bu.depth === 2
                  ? 'pl-10 text-muted-foreground/70 text-sm'
                  : ''
            }
          >
            {bu.depth > 0 && (
              <span className="mr-1 text-muted-foreground/40">
                {'└─'.padStart(bu.depth * 2, ' ')}
              </span>
            )}
            {bu.name}
            {!bu.isActive && <span className="ml-2 text-xs text-destructive">(inactive)</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
