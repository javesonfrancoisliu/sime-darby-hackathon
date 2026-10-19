import type { CreateQuizBody } from "@sdh/contracts";

export const ecoQuiz: CreateQuizBody = {
  title: "Eco Neighbour Quiz",
  passMark: 3,
  questions: [
    {
      question: "Which bin does a clean plastic bottle go into?",
      options: ["General waste", "Recycling", "Food waste", "Garden waste"],
      correctIndex: 1,
    },
    {
      question: "What is a good way to save water at home?",
      options: [
        "Leave the tap running while brushing",
        "Wash the car every day",
        "Fix a dripping tap",
        "Water plants at noon",
      ],
      correctIndex: 2,
    },
    {
      question: "When is the best time to water plants in hot weather?",
      options: ["Early morning", "Midday", "Mid afternoon", "Never"],
      correctIndex: 0,
    },
    {
      question: "What can you do with used cooking oil?",
      options: [
        "Pour it down the drain",
        "Throw it into the river",
        "Bury it in the garden",
        "Collect it in a sealed bottle for the collection point",
      ],
      correctIndex: 3,
    },
  ],
};
