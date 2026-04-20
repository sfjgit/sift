'use client';

import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  ControllerProps,
  FieldValues,
} from 'react-hook-form';

export const Form = FormProvider;

type FormFieldProps<TFieldValues extends FieldValues = FieldValues> = ControllerProps<TFieldValues>;

export function FormField<TFieldValues extends FieldValues = FieldValues>(
  props: FormFieldProps<TFieldValues>
) {
  return <Controller {...props} />;
}

export const FormItem = ({ children }: { children: React.ReactNode }) => {
  return <div className="space-y-1.5">{children}</div>;
};

export const FormLabel = ({ children }: { children: React.ReactNode }) => {
  return <label className="text-sm font-medium">{children}</label>;
};

export const FormControl = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export const FormMessage = ({ children }: { children?: React.ReactNode }) => {
  if (!children) return null;
  return <p className="text-xs text-red-500">{children}</p>;
};
