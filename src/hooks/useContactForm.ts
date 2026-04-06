import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useContactForm() {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: "",
    email: "",
    message: "",
    company: "",
    phone: "",
    subject: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = useCallback((e: any) => {
    if (e?.target) {
      setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    }
  }, []);

  const handleSubmit = useCallback(
    async (e?: any) => {
      if (e?.preventDefault) e.preventDefault();

      const { name, email, message } = formData;
      if (!name?.trim() || !email?.trim() || !message?.trim()) return;

      setIsSubmitting(true);

      try {
        const { error } = await supabase.from("contacts").insert({
          name: name.trim().slice(0, 200),
          email: email.trim().slice(0, 255),
          message: message.trim().slice(0, 5000),
          company: formData.company?.trim()?.slice(0, 200) || null,
          subject: formData.subject?.trim()?.slice(0, 300) || null,
          channel: "website_form",
          status: "new",
        });

        if (error) throw error;
        setIsSubmitted(true);
        setFormData({ name: "", email: "", message: "", company: "", phone: "", subject: "" });
      } catch (err) {
        console.error("Contact form error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

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
