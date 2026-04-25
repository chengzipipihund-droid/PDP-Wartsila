interface TagProps {
  label: string;
}

export default function Tag({ label }: TagProps) {
  return (
    <span className="inline-block px-4 py-1.5 border border-gray-300 rounded-full text-xs sm:text-sm text-gray-700">
      {label}
    </span>
  );
}
