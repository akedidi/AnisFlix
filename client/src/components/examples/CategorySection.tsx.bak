import { useState } from "react";
import CategorySection from "../CategorySection";

export default function CategorySectionExample() {
  const [selected, setSelected] = useState("Tous");
  const categories = ["Tous", "Action", "Comédie", "Drame", "Science-Fiction", "Horreur", "Romance"];

  return (
    <div className="p-4">
      <CategorySection
        categories={categories}
        selectedCategory={selected}
        onCategoryChange={setSelected}
      />
    </div>
  );
}
