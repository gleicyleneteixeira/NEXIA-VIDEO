import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export interface Question {
  id: string;
  category: string;
  question_text: string;
  alternatives: unknown[];
  correct_answer: number;
  explanation?: string;
  difficulty?: string;
}

export interface SimulatedExamQuestions {
  questions: Question[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for selecting questions for a simulated exam.
 * 
 * Features:
 * 1. General exam: Hard limit of exactly 30 questions
 * 2. Category exam: 30 random questions from selected category, 
 *    with fallback to general questions if category has < 30
 */
export function useSimuladoQuestions(
  selectedCategory: string | null
) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Category exam logic runs based on selectedCategory dependency
    if (!selectedCategory) {
      // General Exam Mode
      fetchGeneralExamQuestions(setQuestions, setIsLoading, setError);
    } else {
      // Category Exam Mode
      fetchCategoryExamQuestions(
        selectedCategory,
        setQuestions,
        setIsLoading,
        setError
      );
    }
  }, [selectedCategory]);

  return { questions, isLoading, error };
}

/**
 * Fetches questions for General Exam with hard 30-question limit
 */
async function fetchGeneralExamQuestions(
  setQuestions: (q: Question[]) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (err: string | null) => void
) {
  try {
    setIsLoading(true);
    
    // Default distribution: 7 questions per major subject, totaling 30
    const defaultWeights: Record<string, number> = {
      legislacao: 7,
      sinalizacao: 7,
      mecanica: 7,
      hidraulica: 2,
      eletrica: 2,
      pneumatica: 2,
    };

    // Fetch questions per subject based on default weights
    let allQuestions: Question[] = [];

    // Fetch questions per subject based on weights
    for (const [category, count] of Object.entries(defaultWeights)) {
      const { data: categoryQuestions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("category", category)
        .limit(count);

      if (error) throw error;
      if (categoryQuestions) {
        allQuestions = [...allQuestions, ...categoryQuestions];
      }
    }

    // Shuffle all questions
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);

    // HARD LIMIT: Force exactly 30 items
    const finalQuestions = shuffled.slice(0, 30);

    setQuestions(finalQuestions);
    setIsLoading(false);
  } catch (err) {
    console.error("Error fetching general exam questions:", err);
    setError("Erro ao carregar questões do simulado geral");
    setQuestions([]);
    setIsLoading(false);
  }
}

/**
 * Fetches questions for Category Exam with 30-question limit and fallback
 */
async function fetchCategoryExamQuestions(
  selectedCategory: string,
  setQuestions: (q: Question[]) => void,
  setIsLoading: (loading: boolean) => void,
  setError: (err: string | null) => void
) {
  try {
    setIsLoading(true);
    
    // Step 1: Get all questions from the selected category and shuffle
    const { data: categoryQuestions, error } = await supabase
      .from("questions")
      .select("*")
      .eq("category", selectedCategory);

    if (error) throw error;
    
    // Shuffle category questions for random selection
    const shuffledCategory = (categoryQuestions || []).sort(() => Math.random() - 0.5);

    // Step 2: Check if we have at least 30 questions from this category
    if (shuffledCategory.length >= 30) {
      // Use exactly 30 random questions from the category
      const finalQuestions = shuffledCategory.slice(0, 30);
      setQuestions(finalQuestions);
      setIsLoading(false);
    } else {
      // FALLBACK: Category has less than 30 questions
      // Fill the remaining with general questions (from other categories)
      const needed = 30 - shuffledCategory.length;

      // Puxa uma margem maior para garantir randomidade nas extras
      const { data: extraQuestions, error: extraError } = await supabase
        .from("questions")
        .select("*")
        .neq("category", selectedCategory)
        .limit(needed * 2);

      if (extraError) throw extraError;

      const shuffledExtra = extraQuestions ? extraQuestions.sort(() => Math.random() - 0.5).slice(0, needed) : [];

      // Combine category questions with extra general questions
      const categoryShuffled = shuffledCategory.sort(() => Math.random() - 0.5);
      const extraShuffled = (shuffledExtra || []).sort(() => Math.random() - 0.5);
      
      const combined = [...categoryShuffled, ...extraShuffled].sort(
        () => Math.random() - 0.5
      );

      // Final hard limit of 30
      const finalQuestions = combined.slice(0, 30);
      setQuestions(finalQuestions);
      setIsLoading(false);
    }
  } catch (err) {
    console.error("Error fetching category exam questions:", err);
    setError("Erro ao carregar questões da categoria");
    setQuestions([]);
    setIsLoading(false);
  }
}