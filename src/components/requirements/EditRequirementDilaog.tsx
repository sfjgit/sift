// // EditRequirementDialog.tsx
// 'use client';

// import { useState } from 'react';
// import { Dialog, DialogContent } from '@/components/ui/dialog';
// import RequirementForm from './RequirementForm';
// import { Requirement } from '@/app/dashboard/requirements/page';
// import { Pencil } from 'lucide-react';

// export default function EditRequirementDialog({
//   requirement,
//   onClose,
//   onSuccess,
// }: {
//   requirement: Requirement;
//   onClose: () => void;
//   onSuccess: () => void;
// }) {
//   return (
//     <Dialog open={true} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden rounded-xl border border-border/60 shadow-2xl">
//         {/* Header */}
//         <div className="relative flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border/50">
//           <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary" />
//           <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
//             <Pencil className="w-4 h-4 text-primary" />
//           </div>
//           <div className="flex-1 min-w-0">
//             <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
//               Edit Requirement
//             </h2>
//             <p className="text-[13px] text-muted-foreground mt-0.5">
//               {requirement.reqCode} · {requirement.client?.name ?? 'No Client'}
//             </p>
//           </div>
//         </div>

//         {/* Form */}
//         <div className="px-6 py-5 overflow-y-auto max-h-[55vh]">
//           <RequirementForm
//             defaultValues={requirement} // 👈 pass existing data
//             requirementId={requirement.id} // 👈 so form knows it's an update
//             onSuccess={onSuccess}
//           />
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
