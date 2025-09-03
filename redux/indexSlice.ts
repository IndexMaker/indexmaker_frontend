import { IndexListEntry } from "@/types/index";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IndexState {
  indices: IndexListEntry[];
  totalManaged: string | null;
  totalVolume: string | null;
}

const initialState: IndexState = {
  indices: [],
  totalManaged: null,
  totalVolume: null,
};

const indexSlice = createSlice({
  name: "index",
  initialState,
  reducers: {
    setIndices(state, action: PayloadAction<IndexListEntry[]>) {
      state.indices = action.payload;
    },
    setTotalManaged(state, action: PayloadAction<string>) {
      state.totalManaged = action.payload;
    },
    setTotalVolume(state, action: PayloadAction<string>) {
      state.totalVolume = action.payload;
    },
  },
});

export const { setIndices, setTotalManaged, setTotalVolume } =
  indexSlice.actions;
export default indexSlice.reducer;
