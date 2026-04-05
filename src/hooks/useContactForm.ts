import { useState, useCallback } from "react";

export function useContactForm() {
  const [formData, setFormData] = useState<Record<string, any>>({ name: "", email: "", message: "", company: "", phone: "", subject: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = useCallback((e: any) => {
    if (e?.target) {
      setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    }
  }, []);

  const handleSubmit = useCallback(async (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    setIsSubmitted(true);
  }, []);

  return {
    formData,
    isSubmitting,
    isSubmitted,
    isPending: isSubmitting,
    handleChange,
    handleSubmit,
    mutateAsync: handleSubmit,
    setFormData,
  };
}
