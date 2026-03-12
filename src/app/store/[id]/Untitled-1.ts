// ... (giữ nguyên phần đầu)
        // 2. Lấy đánh giá trung bình
        const { data: reviewsData, error: reviewsError } = await supabase
          .rpc('get_store_rating', { p_store_id: storeId })
          .single(); // Không ép kiểu ở đây

        if (reviewsError) {
          console.error("Error fetching store rating:", reviewsError);
        }

        // Ép kiểu qua any để bỏ qua kiểm tra của TypeScript
        const ratingInfo = reviewsData as any;

        setStore({
          ...storeData,
          rating_avg: ratingInfo?.avg_rating ?? 0,
          rating_count: ratingInfo?.review_count ?? 0,
        });
// ... (giữ nguyên phần sau)