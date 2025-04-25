import supabase from "../supabase";

export const uploadReceiptData = async (budgetId: string, extractedData: any[], totalAmount: string | null) => {
  const { data, error } = await supabase
    .from("receipts")
    .insert(
      extractedData.map(item => ({
        budget_plan_id: budgetId, // Ensure it's linked to the budget
        item_name: item.name,
        quantity: item.quantity,
        price: item.price,
        total_amount: item.amount,
        created_at: new Date().toISOString(),
      }))
    );

  if (error) {
    console.error("Upload failed:", error);
    return false;
  }

  return true;
};
