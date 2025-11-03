import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface CategorySectionProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategorySection({
  categories,
  selectedCategory,
  onCategoryChange,
}: CategorySectionProps) {
  return (
    <ScrollArea className="w-full">
      <div className="flex gap-2 pb-4">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            data-testid={`button-category-${category.toLowerCase().replace(/\s+/g, "-")}`}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
