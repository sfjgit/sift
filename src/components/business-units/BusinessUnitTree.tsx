'use client';

interface Node {
  id: string;
  name: string;
  isActive: boolean;
  children?: Node[];
}

export function BusinessUnitTree({ tree }: { tree: Node }) {
  if (!tree) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground mb-3">Hierarchy</h2>

      <div className="flex flex-col gap-2">
        <TreeNode node={tree} level={0} />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TreeNode({ node, level }: { node: any; level: number }) {
  return (
    <div>
      {/* Row */}
      <div className="flex items-center gap-2 py-1" style={{ paddingLeft: level * 16 }}>
        {/* Dot */}
        <div className="size-2 rounded-full bg-primary/60" />

        {/* Name */}
        <span className="text-sm text-foreground">{node.name}</span>

        {/* Status */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            node.isActive ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
          }`}
        >
          {node.isActive ? 'active' : 'inactive'}
        </span>
      </div>

      {/* Children */}
      {node.children?.length > 0 && (
        <div className="flex flex-col">
          {node.children.map((child: Node) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
