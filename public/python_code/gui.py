"""
gui.py
------
CustomTkinter GUI for the Exam Seating Arrangement app.

Workflow (4 steps, shown as a left-hand step navigator):
    1. Load Data       - pick the Excel file, sheet, and column mapping
    2. Configure Rooms  - enter number of rooms, benches & seats/bench each
    3. Generate/Preview - run the algorithm, see warnings & a live preview
    4. Export           - save all 4 output Excel files
"""

import os
import threading
import customtkinter as ctk
from tkinter import filedialog, messagebox, ttk
from typing import List, Dict, Optional

import seating_logic as sl

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")

APP_TITLE = "Exam Seating Arrangement Generator"


class RoomRow(ctk.CTkFrame):
    """A single editable row representing one room's configuration."""

    def __init__(self, master, index, remove_callback, default_name=None,
                 default_benches=15, default_seats=3):
        super().__init__(master, fg_color="transparent")
        self.index = index
        self.remove_callback = remove_callback

        self.name_var = ctk.StringVar(value=default_name or f"Room {index + 1}")
        self.benches_var = ctk.StringVar(value=str(default_benches))
        self.seats_var = ctk.StringVar(value=str(default_seats))

        ctk.CTkLabel(self, text=f"#{index + 1}", width=30).grid(row=0, column=0, padx=(4, 6))
        ctk.CTkEntry(self, textvariable=self.name_var, width=140).grid(row=0, column=1, padx=4)
        ctk.CTkEntry(self, textvariable=self.benches_var, width=90).grid(row=0, column=2, padx=4)
        ctk.CTkEntry(self, textvariable=self.seats_var, width=90).grid(row=0, column=3, padx=4)

        cap_label = ctk.CTkLabel(self, text="", width=90, text_color="#666666")
        cap_label.grid(row=0, column=4, padx=4)
        self.cap_label = cap_label
        for v in (self.benches_var, self.seats_var):
            v.trace_add("write", lambda *_: self._update_capacity())
        self._update_capacity()

        remove_btn = ctk.CTkButton(self, text="✕", width=30, fg_color="#C0392B",
                                    hover_color="#922B21",
                                    command=lambda: self.remove_callback(self))
        remove_btn.grid(row=0, column=5, padx=(10, 4))

    def _update_capacity(self):
        try:
            cap = int(self.benches_var.get()) * int(self.seats_var.get())
            self.cap_label.configure(text=f"= {cap} seats")
        except ValueError:
            self.cap_label.configure(text="")

    def get_config(self):
        name = self.name_var.get().strip()
        benches = int(self.benches_var.get())
        seats = int(self.seats_var.get())
        if not name:
            raise ValueError("Room name cannot be empty.")
        if benches <= 0 or seats <= 0:
            raise ValueError(f"Room '{name}' must have positive bench and seat counts.")
        return sl.RoomConfig(name=name, num_benches=benches, seats_per_bench=seats)


class BatchRow(ctk.CTkFrame):
    """One division-batch row for Second Language room grouping."""

    def __init__(self, master, index, remove_callback, default_divs=""):
        super().__init__(master, fg_color="transparent")
        self.index = index
        self.remove_callback = remove_callback
        self.divisions_var = ctk.StringVar(value=default_divs)

        ctk.CTkLabel(self, text=f"Batch {index + 1}:", width=60).grid(row=0, column=0, padx=(4, 6))
        ctk.CTkEntry(self, textvariable=self.divisions_var, width=360,
                   placeholder_text="e.g. S1, S2, S3, S5").grid(row=0, column=1, padx=4)
        ctk.CTkButton(self, text="✕", width=30, fg_color="#C0392B", hover_color="#922B21",
                      command=lambda: self.remove_callback(self)).grid(row=0, column=2, padx=(8, 4))

    def get_divisions(self):
        return sl.parse_division_list(self.divisions_var.get())


class CustomDivRow(ctk.CTkFrame):
    """A row representing one division's subject & exam status for a custom exam date."""

    def __init__(self, master, division_code: str, default_subject: str = "", default_enabled: bool = True):
        super().__init__(master, fg_color="transparent")
        self.division_code = division_code
        self.enabled_var = ctk.BooleanVar(value=default_enabled)
        self.subject_var = ctk.StringVar(value=default_subject)

        self.check = ctk.CTkCheckBox(
            self, text=f"Div {division_code}",
            variable=self.enabled_var, command=self._on_toggle, width=80
        )
        self.check.grid(row=0, column=0, sticky="w", padx=(4, 6), pady=2)

        ctk.CTkLabel(self, text="Subject:").grid(row=0, column=1, sticky="w", padx=(0, 4))
        self.subject_entry = ctk.CTkEntry(self, textvariable=self.subject_var, width=160, placeholder_text="e.g. Physics")
        self.subject_entry.grid(row=0, column=2, sticky="w", padx=4)

        self._on_toggle()

    def _on_toggle(self):
        state = "normal" if self.enabled_var.get() else "disabled"
        self.subject_entry.configure(state=state)

    def get_mapping(self):
        """Return (division_code, subject) if enabled, else (division_code, None)."""
        if self.enabled_var.get():
            subj = self.subject_var.get().strip()
            return self.division_code, subj if subj else sl.DIVISION_LABELS.get(self.division_code, self.division_code)
        return self.division_code, None


class SeatingApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1080x720")
        self.minsize(940, 620)

        # Shared state
        self.file_path = None
        self.sheet_var = ctk.StringVar()
        self.header_row_var = ctk.StringVar(value="1")
        self.col_roll_var = ctk.StringVar()
        self.col_name_var = ctk.StringVar()
        self.col_division_var = ctk.StringVar()
        self.col_admn_var = ctk.StringVar(value="(none)")
        self.session_type_var = ctk.StringVar(value="Regular Subjects")
        self.single_group_var = ctk.BooleanVar(value=False)
        self.session_label_var = ctk.StringVar(value="")
        self.custom_date_var = ctk.StringVar(value="")
        self.custom_div_rows = []
        self.students = []
        self.room_rows = []
        self.result = None
        self.rooms = []
        self.division_labels = {}   # e.g. {"S1": "Bio Science"}
        self.use_division_batches_var = ctk.BooleanVar(value=False)
        self.batch_rows = []

        self._build_layout()
        self.show_step(0)

    # ------------------------------------------------------------------ #
    # Layout scaffolding
    # ------------------------------------------------------------------ #

    def _build_layout(self):
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Sidebar / step navigator
        self.sidebar = ctk.CTkFrame(self, width=210, corner_radius=0)
        self.sidebar.grid(row=0, column=0, sticky="nswe")
        self.sidebar.grid_rowconfigure(6, weight=1)

        ctk.CTkLabel(self.sidebar, text="Seating\nArrangement", font=ctk.CTkFont(size=20, weight="bold"),
                     justify="left").grid(row=0, column=0, padx=20, pady=(24, 20), sticky="w")

        self.step_buttons = []
        step_names = ["1. Load Data", "2. Configure Rooms", "3. Generate & Preview", "4. Export"]
        for i, name in enumerate(step_names):
            btn = ctk.CTkButton(self.sidebar, text=name, anchor="w",
                                 fg_color="transparent", text_color=("#1f1f1f", "#eaeaea"),
                                 hover_color="#d7e6f5",
                                 command=lambda i=i: self.show_step(i))
            btn.grid(row=i + 1, column=0, padx=14, pady=6, sticky="we")
            self.step_buttons.append(btn)

        # Main content area
        self.content = ctk.CTkFrame(self, fg_color="transparent")
        self.content.grid(row=0, column=1, sticky="nswe", padx=20, pady=20)
        self.content.grid_columnconfigure(0, weight=1)
        self.content.grid_rowconfigure(0, weight=1)

        self.steps = [
            self._build_step1(),
            self._build_step2(),
            self._build_step3(),
            self._build_step4(),
        ]
        self._update_grouping_column_ui()

    def show_step(self, idx):
        for i, frame in enumerate(self.steps):
            frame.grid_forget()
        self.steps[idx].grid(row=0, column=0, sticky="nswe")
        for i, btn in enumerate(self.step_buttons):
            btn.configure(fg_color="#2C3E50" if i == idx else "transparent",
                          text_color=("white" if i == idx else ("#1f1f1f", "#eaeaea")))
        if idx == 1:
            self._refresh_room_capacity_summary()
            self._update_batch_section_visibility()

    # ------------------------------------------------------------------ #
    # STEP 1 - Load Data
    # ------------------------------------------------------------------ #

    def _build_step1(self):
        frame = ctk.CTkScrollableFrame(self.content, fg_color="transparent")
        frame.grid_columnconfigure(1, weight=1)

        ctk.CTkLabel(frame, text="Step 1 - Load Student Data",
                     font=ctk.CTkFont(size=22, weight="bold")).grid(
            row=0, column=0, columnspan=3, sticky="w", pady=(0, 16))

        ctk.CTkButton(frame, text="Choose Excel File...", command=self._choose_file
                      ).grid(row=1, column=0, sticky="w", pady=6)
        self.file_label = ctk.CTkLabel(frame, text="No file selected", text_color="#666666")
        self.file_label.grid(row=1, column=1, sticky="w", padx=10)

        # --- Session type ---
        ctk.CTkLabel(frame, text="Exam session", font=ctk.CTkFont(weight="bold")
                     ).grid(row=1, column=2, sticky="w", padx=(30, 6))
        session_menu = ctk.CTkOptionMenu(
            frame, variable=self.session_type_var,
            values=["Regular Subjects", "Second Language", "English (single group)", "Custom"],
            command=self._on_session_type_change, width=220)
        session_menu.grid(row=1, column=3, sticky="w")

        ctk.CTkLabel(frame, text="Sheet:").grid(row=2, column=0, sticky="w", pady=6)
        self.sheet_menu = ctk.CTkOptionMenu(frame, variable=self.sheet_var, values=["-"],
                                             command=lambda _: self._reload_headers())
        self.sheet_menu.grid(row=2, column=1, sticky="w", padx=10)

        ctk.CTkLabel(frame, text="Header row number:").grid(row=3, column=0, sticky="w", pady=6)
        ctk.CTkEntry(frame, textvariable=self.header_row_var, width=60).grid(
            row=3, column=1, sticky="w", padx=10)
        ctk.CTkButton(frame, text="Refresh Columns", width=140,
                      command=self._reload_headers).grid(row=3, column=2, sticky="w")

        ctk.CTkLabel(frame, text="Column mapping", font=ctk.CTkFont(weight="bold")
                     ).grid(row=4, column=0, columnspan=3, sticky="w", pady=(20, 6))

        ctk.CTkLabel(frame, text="ID column (optional, not used for roll no.):").grid(row=5, column=0, sticky="w", pady=6)
        self.col_roll_menu = ctk.CTkOptionMenu(frame, variable=self.col_roll_var, values=["-"])
        self.col_roll_menu.grid(row=5, column=1, sticky="w", padx=10)

        ctk.CTkLabel(frame, text="Name column:").grid(row=6, column=0, sticky="w", pady=6)
        self.col_name_menu = ctk.CTkOptionMenu(frame, variable=self.col_name_var, values=["-"])
        self.col_name_menu.grid(row=6, column=1, sticky="w", padx=10)

        self.grouping_col_label = ctk.CTkLabel(
            frame, text="Division column (S1-S8, class/stream):")
        self.grouping_col_label.grid(row=7, column=0, sticky="w", pady=6)
        self.col_division_menu = ctk.CTkOptionMenu(frame, variable=self.col_division_var, values=["-"])
        self.col_division_menu.grid(row=7, column=1, sticky="w", padx=10)
        self.grouping_col_hint = ctk.CTkLabel(
            frame,
            text="Division = which class the student belongs to (S1-S8). "
                 "Not the same as Second Language.",
            text_color="#666666", wraplength=520, justify="left")
        self.grouping_col_hint.grid(row=7, column=2, columnspan=2, sticky="w", padx=10)

        ctk.CTkLabel(frame, text="Admission No. column (optional):").grid(row=8, column=0, sticky="w", pady=6)
        self.col_admn_menu = ctk.CTkOptionMenu(frame, variable=self.col_admn_var, values=["(none)"])
        self.col_admn_menu.grid(row=8, column=1, sticky="w", padx=10)

        self.single_group_check = ctk.CTkCheckBox(
            frame, text="Treat everyone as ONE single group (English exam day only — "
                        "everyone takes the same paper; grouping column is ignored)",
            variable=self.single_group_var, command=self._on_single_group_toggle)
        self.single_group_check.grid(row=9, column=0, columnspan=3, sticky="w", pady=(16, 6))

        ctk.CTkLabel(frame, text="Session label (used to name your output files, e.g. "
                                  "'Regular', 'SecondLanguage', 'English'):").grid(
            row=10, column=0, columnspan=2, sticky="w", pady=(10, 4))
        ctk.CTkEntry(frame, textvariable=self.session_label_var, width=220).grid(
            row=11, column=0, sticky="w")

        # --- Custom Exam Date & Subject Schedule panel ---
        self.custom_section = ctk.CTkFrame(frame, fg_color="#F4F7FA", corner_radius=8)
        self.custom_section.grid(row=12, column=0, columnspan=4, sticky="we", pady=(14, 10))
        self.custom_section.grid_columnconfigure(0, weight=1)

        custom_hdr = ctk.CTkFrame(self.custom_section, fg_color="transparent")
        custom_hdr.grid(row=0, column=0, sticky="we", padx=12, pady=(10, 4))
        ctk.CTkLabel(custom_hdr, text="Custom Exam Date & Subject Schedule",
                     font=ctk.CTkFont(weight="bold", size=14)).pack(side="left")

        date_bar = ctk.CTkFrame(self.custom_section, fg_color="transparent")
        date_bar.grid(row=1, column=0, sticky="w", padx=12, pady=4)
        ctk.CTkLabel(date_bar, text="Exam Date:").pack(side="left", padx=(0, 6))
        ctk.CTkEntry(date_bar, textvariable=self.custom_date_var, width=160,
                     placeholder_text="e.g. 15-08-2026 or Day 1").pack(side="left")
        ctk.CTkLabel(date_bar, text="(Included in output filenames, attendance sheets, and notices)",
                     text_color="#666666").pack(side="left", padx=10)

        ctk.CTkLabel(
            self.custom_section,
            text="Check divisions that have an exam on this date and enter their exam subject paper. "
                 "Unchecked divisions will be excluded for this date.",
            text_color="#555555", wraplength=700, justify="left"
        ).grid(row=2, column=0, sticky="w", padx=12, pady=(0, 6))

        self.custom_div_frame = ctk.CTkFrame(self.custom_section, fg_color="transparent")
        self.custom_div_frame.grid(row=3, column=0, sticky="we", padx=12, pady=(0, 10))

        self.custom_div_rows = []
        self._rebuild_custom_div_rows(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"])

        ctk.CTkButton(frame, text="Load Students →", height=38,
                      command=self._load_students).grid(row=13, column=0, sticky="w", pady=(24, 6))

        self.step1_status = ctk.CTkLabel(frame, text="", text_color="#1a7a1a", justify="left")
        self.step1_status.grid(row=14, column=0, columnspan=3, sticky="w", pady=6)

        # Hide custom section by default (Regular Subjects is initial)
        self.custom_section.grid_forget()

        return frame

    def _rebuild_custom_div_rows(self, div_codes: List[str]):
        """Rebuild division subject rows for Custom mode."""
        for row in list(self.custom_div_rows):
            row.destroy()
        self.custom_div_rows = []

        for i, code in enumerate(div_codes):
            default_subj = sl.DIVISION_LABELS.get(code, code)
            row = CustomDivRow(self.custom_div_frame, division_code=code, default_subject=default_subj)
            row.grid(row=i // 2, column=i % 2, sticky="w", padx=10, pady=4)
            self.custom_div_rows.append(row)

    def _update_grouping_column_ui(self):
        """Update labels/hints for the grouping column based on exam session."""
        session = self.session_type_var.get()
        if session == "Second Language":
            self.grouping_col_label.configure(
                text="Second Language column (SL):")
            self.grouping_col_hint.configure(
                text="Second Language = Arabic (A), Hindi (H), Malayalam (M), Urdu (U). "
                     "This is separate from Division (S1-S8). Map the SL column, not DIVISION.")
        elif session.startswith("English"):
            self.grouping_col_label.configure(
                text="Grouping column (ignored for English):")
            self.grouping_col_hint.configure(
                text="English is the same paper for everyone. Single-group mode is ON — "
                     "the grouping column is not used.")
        elif session == "Regular Subjects":
            self.grouping_col_label.configure(
                text="Division column (S1-S8, class/stream):")
            self.grouping_col_hint.configure(
                text="Division = which class the student belongs to: S1-S4 Bio Science, "
                     "S5 CS, S8 CS, S6 Commerce, S7 Humanities. Map the DIVISION column, not SL.")
        elif session == "Custom":
            self.grouping_col_label.configure(
                text="Division column (S1-S8, class/stream):")
            self.grouping_col_hint.configure(
                text="Class division column (S1-S8). Used to map each division's subject for this exam date.")
        else:
            self.grouping_col_label.configure(text="Grouping column:")
            self.grouping_col_hint.configure(
                text="Column used to decide who must not sit next to each other.")

    def _format_group_summary(self, counts, session):
        parts = []
        for code, count in sorted(counts.items()):
            label = sl.group_display_label(code)
            if label != code:
                parts.append(f"{code} ({label}): {count}")
            else:
                parts.append(f"{code}: {count}")
        return ", ".join(parts)

    def _group_labels_for_session(self, counts, session):
        if session == "Second Language":
            return {c: sl.SECOND_LANGUAGE_LABELS.get(c, c) for c in counts}
        if session == "Regular Subjects":
            return {c: sl.DIVISION_LABELS.get(c, c) for c in counts}
        if session == "Custom":
            return {c: c for c in counts}
        return {c: sl.group_display_label(c) for c in counts}

    def _choose_file(self):
        path = filedialog.askopenfilename(
            title="Select student list Excel file",
            filetypes=[("Excel files", "*.xlsx *.xlsm")]
        )
        if not path:
            return
        self.file_path = path
        self.file_label.configure(text=os.path.basename(path))
        try:
            sheets = sl.get_sheet_names(path)
        except Exception as e:
            messagebox.showerror("Error reading file", str(e))
            return
        self.sheet_menu.configure(values=sheets)
        if sheets:
            self.sheet_var.set(sheets[0])
        self._reload_headers()

    def _on_session_type_change(self, choice):
        """Auto-configure sensible defaults when the session type changes."""
        self._update_grouping_column_ui()
        if choice == "Regular Subjects":
            self.single_group_var.set(False)
            self.single_group_check.configure(state="normal")
            self.col_division_menu.configure(state="normal")
            if not self.session_label_var.get():
                self.session_label_var.set("Regular")
            guess = self._guess_column(["division"])
            if guess:
                self.col_division_var.set(guess)
        elif choice == "Second Language":
            self.single_group_var.set(False)
            self.single_group_check.configure(state="normal")
            self.col_division_menu.configure(state="normal")
            self.session_label_var.set("SecondLanguage")
            guess = self._guess_column(["sl"])
            if guess:
                self.col_division_var.set(guess)
        elif choice.startswith("English"):
            self.single_group_var.set(True)
            self.use_division_batches_var.set(False)
            self.session_label_var.set("English")
            self.custom_section.grid_forget()
            self._on_single_group_toggle()
        elif choice == "Custom":
            self.single_group_var.set(False)
            self.single_group_check.configure(state="normal")
            self.col_division_menu.configure(state="normal")
            self.use_division_batches_var.set(False)
            self.custom_section.grid(row=12, column=0, columnspan=4, sticky="we", pady=(14, 10))
            if not self.session_label_var.get() or self.session_label_var.get() in ("Regular", "SecondLanguage", "English"):
                date_val = self.custom_date_var.get().strip()
                if date_val:
                    sanitized_date = date_val.replace("/", "-").replace(" ", "_")
                    self.session_label_var.set(f"Custom_{sanitized_date}")
                else:
                    self.session_label_var.set("Custom")
        else:
            self.use_division_batches_var.set(False)
            self.custom_section.grid_forget()
        self._update_batch_section_visibility()

    def _guess_column(self, keywords):
        try:
            headers = self.col_division_menu.cget("values")
        except Exception:
            return None
        # Prefer an exact (case-insensitive) match first, e.g. "SL" over "SL NO".
        for h in headers:
            if h.strip().lower() in keywords:
                return h
        for h in headers:
            if any(k in h.lower() for k in keywords):
                return h
        return None

    def _on_single_group_toggle(self):
        if self.single_group_var.get():
            self.col_division_menu.configure(state="disabled")
        else:
            self.col_division_menu.configure(state="normal")

    def _reload_headers(self):
        if not self.file_path or not self.sheet_var.get():
            return
        try:
            header_row = int(self.header_row_var.get())
            headers = sl.get_headers(self.file_path, self.sheet_var.get(), header_row)
        except Exception as e:
            messagebox.showerror("Error reading columns", str(e))
            return
        self.col_roll_menu.configure(values=headers)
        self.col_name_menu.configure(values=headers)
        self.col_division_menu.configure(values=headers)
        self.col_admn_menu.configure(values=["(none)"] + headers)

        # Best-effort auto guess of common column names
        def guess(options, keywords):
            for h in options:
                if any(k in h.lower() for k in keywords):
                    return h
            return options[0] if options else ""

        self.col_roll_var.set(guess(headers, ["roll", "sl no", "admn", "id"]))
        self.col_name_var.set(guess(headers, ["name"]))
        session = self.session_type_var.get()
        if session == "Second Language":
            div_guess = self._guess_column(["sl", "second lang", "language"])
            if not div_guess:
                div_guess = guess(headers, ["sl", "second lang", "language"])
        elif session.startswith("English"):
            div_guess = self._guess_column(["sl"]) or guess(headers, ["division", "class", "stream"])
        elif session == "Regular Subjects":
            div_guess = self._guess_column(["division"])
            if not div_guess:
                div_guess = guess(headers, ["division", "class", "stream"])
        else:
            div_guess = guess(headers, ["division", "class", "stream"])
        if div_guess:
            self.col_division_var.set(div_guess)
        admn_guess = guess(headers, ["admn"])
        self.col_admn_var.set(admn_guess if admn_guess else "(none)")

    def _load_students(self):
        if not self.file_path:
            messagebox.showwarning("No file", "Please choose an Excel file first.")
            return
        try:
            header_row = int(self.header_row_var.get())
            admn_col = None if self.col_admn_var.get() == "(none)" else self.col_admn_var.get()
            single_group = self.single_group_var.get()
            # When treating everyone as one group, the division column is optional
            # (we just need Roll + Name); fall back to the name column if no
            # division column has been picked.
            div_col = self.col_division_var.get() if not single_group else (
                self.col_division_var.get() or self.col_name_var.get())

            session = self.session_type_var.get()
            subject_mapping = None
            if session == "Custom":
                subject_mapping = {}
                for row in self.custom_div_rows:
                    div_code, subj = row.get_mapping()
                    if subj is not None:
                        subject_mapping[div_code] = subj

                if not subject_mapping:
                    messagebox.showwarning("No division selected",
                                           "Please check at least one division for Custom exam date mode.")
                    return

                date_val = self.custom_date_var.get().strip()
                if date_val:
                    sanitized_date = date_val.replace("/", "-").replace(" ", "_")
                    self.session_label_var.set(f"Custom_{sanitized_date}")
                else:
                    self.session_label_var.set("Custom")

            self.students = sl.load_students_from_excel(
                self.file_path,
                sheet_name=self.sheet_var.get(),
                col_roll=self.col_roll_var.get(),
                col_name=self.col_name_var.get(),
                col_division=div_col,
                col_admn=admn_col,
                header_row=header_row,
                subject_mapping=subject_mapping,
            )
            if single_group:
                label = self.session_label_var.get().strip() or "ALL"
                for s in self.students:
                    s.division = label
        except Exception as e:
            messagebox.showerror("Error loading students", str(e))
            return

        if not self.students:
            self.step1_status.configure(text="No students found - check column mapping.", text_color="#a11")
            return

        from collections import Counter
        counts = Counter(s.division for s in self.students)
        session = self.session_type_var.get()
        summary = self._format_group_summary(counts, session)
        self.division_labels = self._group_labels_for_session(counts, session)

        group_term = "language group(s)" if session == "Second Language" else (
            "exam subject(s)" if session == "Custom" else "division(s)"
        )
        status_lines = [
            f"Loaded {len(self.students)} students across {len(counts)} {group_term}.",
            summary,
        ]
        status_color = "#1a7a1a"

        loaded_codes = set(counts.keys())
        if session == "Second Language" and loaded_codes.issubset(sl.DIVISION_CODES):
            status_lines.append(
                "WARNING: These look like DIVISION codes (S1-S8), not Second Language. "
                "Division = class/stream (S1-S8). Second Language = SL column (A/H/M/U). "
                "Change the grouping column to SL."
            )
            status_color = "#a60"
        elif session == "Regular Subjects" and loaded_codes.issubset(sl.SECOND_LANGUAGE_CODES):
            status_lines.append(
                "WARNING: These look like Second Language codes (A/H/M/U), not divisions. "
                "For Regular Subjects map the DIVISION column (S1-S8), not SL."
            )
            status_color = "#a60"
        elif session == "Second Language" and len(counts) < 2:
            status_lines.append(
                "WARNING: Second Language expects several language groups (A/H/M/U in the SL "
                "column), but only one was found. Use the full-list sheet 'FINAL LIST +2.CSV', "
                "map the SL column (not SL NO, CLASS, or DIVISION), and turn OFF single-group mode."
            )
            status_color = "#a60"
        elif session == "Regular Subjects" and len(counts) < 2:
            status_lines.append(
                "WARNING: Regular Subjects expects several divisions (S1-S8), but only one was "
                "found. Use the full-list sheet, not a single-division sheet like S1."
            )
            status_color = "#a60"
        elif single_group and session != "English (single group)":
            status_lines.append(
                "NOTE: 'Treat everyone as ONE single group' is ON — every student is treated "
                "as the same paper, so one seat per bench will be left empty as a spacer."
            )
            status_color = "#a60"

        self.step1_status.configure(
            text="\n".join(status_lines),
            text_color=status_color)
        self.show_step(1)

    # ------------------------------------------------------------------ #
    # STEP 2 - Configure Rooms
    # ------------------------------------------------------------------ #

    def _build_step2(self):
        frame = ctk.CTkFrame(self.content, fg_color="transparent")
        frame.grid_columnconfigure(0, weight=1)
        frame.grid_rowconfigure(3, weight=1)

        ctk.CTkLabel(frame, text="Step 2 - Configure Rooms",
                     font=ctk.CTkFont(size=22, weight="bold")).grid(
            row=0, column=0, sticky="w", pady=(0, 6))
        ctk.CTkLabel(frame, text="Set the number of rooms, then benches and seats-per-bench for each room. "
                                  "Seats per bench can differ between rooms.",
                     text_color="#666666", wraplength=700, justify="left").grid(
            row=1, column=0, sticky="w", pady=(0, 12))

        top_bar = ctk.CTkFrame(frame, fg_color="transparent")
        top_bar.grid(row=2, column=0, sticky="we", pady=(0, 10))
        ctk.CTkLabel(top_bar, text="Total rooms:").pack(side="left", padx=(0, 6))
        self.total_rooms_var = ctk.StringVar(value="1")
        ctk.CTkEntry(top_bar, textvariable=self.total_rooms_var, width=60).pack(side="left")
        ctk.CTkButton(top_bar, text="Set", width=60, command=self._set_room_count).pack(side="left", padx=8)
        ctk.CTkButton(top_bar, text="+ Add Room", command=self._add_room_row).pack(side="left", padx=8)
        ctk.CTkButton(top_bar, text="Load Default 16-Room Setup", fg_color="#7D3C98",
                      hover_color="#5B2C6F", command=self._load_default_rooms).pack(side="left", padx=8)

        header = ctk.CTkFrame(frame, fg_color="transparent")
        header.grid(row=3, column=0, sticky="we")
        for i, (txt, w) in enumerate([("#", 30), ("Room Name", 140), ("Benches", 90),
                                       ("Seats/Bench", 90), ("Capacity", 90), ("", 30)]):
            ctk.CTkLabel(header, text=txt, width=w, font=ctk.CTkFont(weight="bold")).grid(
                row=0, column=i, padx=4)

        self.rooms_scroll = ctk.CTkScrollableFrame(frame, fg_color="transparent", height=280)
        self.rooms_scroll.grid(row=4, column=0, sticky="nswe", pady=(4, 10))
        frame.grid_rowconfigure(4, weight=1)

        # --- Division batches (Second Language only) ---
        self.batch_section = ctk.CTkFrame(frame, fg_color="#F4F7FA", corner_radius=8)
        self.batch_section.grid(row=5, column=0, sticky="we", pady=(0, 10))
        self.batch_section.grid_columnconfigure(0, weight=1)

        batch_hdr = ctk.CTkFrame(self.batch_section, fg_color="transparent")
        batch_hdr.grid(row=0, column=0, sticky="we", padx=12, pady=(10, 4))
        self.batch_enable_check = ctk.CTkCheckBox(
            batch_hdr,
            text="Split by division batches (Second Language only)",
            variable=self.use_division_batches_var,
            command=self._on_batch_toggle)
        self.batch_enable_check.pack(side="left")

        ctk.CTkLabel(
            self.batch_section,
            text="Each batch uses its own block of rooms in list order (Batch 1 -> first rooms, "
                 "Batch 2 -> next rooms, ...). Divisions within a batch are seated in ascending order "
                 "(S1, S2, S3...). Batches are never mixed in the same room.",
            text_color="#555555", wraplength=700, justify="left"
        ).grid(row=1, column=0, sticky="w", padx=12, pady=(0, 6))

        self.batch_rows_frame = ctk.CTkFrame(self.batch_section, fg_color="transparent")
        self.batch_rows_frame.grid(row=2, column=0, sticky="we", padx=12)

        batch_btns = ctk.CTkFrame(self.batch_section, fg_color="transparent")
        batch_btns.grid(row=3, column=0, sticky="w", padx=12, pady=(6, 10))
        self.batch_add_btn = ctk.CTkButton(batch_btns, text="+ Add Batch", width=100,
                                           command=self._add_batch_row)
        self.batch_add_btn.pack(side="left", padx=(0, 8))
        ctk.CTkButton(batch_btns, text="Default: S1-S3,S5,S8 | S4,S6,S7", width=220,
                      fg_color="#7D3C98", hover_color="#5B2C6F",
                      command=self._load_default_batches).pack(side="left")

        bottom = ctk.CTkFrame(frame, fg_color="transparent")
        bottom.grid(row=6, column=0, sticky="we")
        self.total_capacity_label = ctk.CTkLabel(bottom, text="", font=ctk.CTkFont(weight="bold"))
        self.total_capacity_label.pack(side="left")
        ctk.CTkButton(bottom, text="Save Rooms & Continue →", height=38,
                      command=self._save_rooms).pack(side="right")

        self._add_room_row()  # start with one row
        self._load_default_batches(silent=True)
        self._update_batch_section_visibility()
        return frame

    def _update_batch_section_visibility(self):
        is_sl = self.session_type_var.get() == "Second Language"
        state = "normal" if is_sl else "disabled"
        if hasattr(self, "batch_section"):
            self.batch_enable_check.configure(state=state)
            self.batch_add_btn.configure(state=state if self.use_division_batches_var.get() and is_sl else "disabled")
            for row in self.batch_rows:
                for w in row.winfo_children():
                    if isinstance(w, ctk.CTkEntry):
                        w.configure(state=state if self.use_division_batches_var.get() and is_sl else "disabled")
                    elif isinstance(w, ctk.CTkButton):
                        w.configure(state=state if self.use_division_batches_var.get() and is_sl else "disabled")

    def _on_batch_toggle(self):
        if self.use_division_batches_var.get() and not self.batch_rows:
            self._load_default_batches(silent=True)
        self._update_batch_section_visibility()

    def _add_batch_row(self, default_divs=""):
        idx = len(self.batch_rows)
        row = BatchRow(self.batch_rows_frame, idx, self._remove_batch_row, default_divs=default_divs)
        row.grid(row=idx, column=0, sticky="we", pady=2)
        self.batch_rows.append(row)
        self._reindex_batch_rows()
        self._update_batch_section_visibility()

    def _remove_batch_row(self, row_widget):
        if len(self.batch_rows) <= 1:
            messagebox.showinfo("Cannot remove", "At least one batch is required when batch mode is on.")
            return
        row_widget.destroy()
        self.batch_rows.remove(row_widget)
        self._reindex_batch_rows()
        self._update_batch_section_visibility()

    def _reindex_batch_rows(self):
        for i, row in enumerate(self.batch_rows):
            row.index = i
            row.grid(row=i, column=0, sticky="we", pady=2)
            row.winfo_children()[0].configure(text=f"Batch {i + 1}:")

    def _load_default_batches(self, silent=False):
        defaults = ["S1, S2, S3, S5, S8", "S4, S6, S7"]
        if self.batch_rows and not silent:
            if not messagebox.askyesno("Replace batches?", "Replace current batch list with the default?"):
                return
            for row in list(self.batch_rows):
                row.destroy()
            self.batch_rows = []
        elif not self.batch_rows:
            pass
        else:
            return
        for spec in defaults:
            self._add_batch_row(default_divs=spec)

    def _get_division_batches(self):
        """Return parsed batch lists or None if batch mode is off."""
        if not self.use_division_batches_var.get():
            return None
        if self.session_type_var.get() != "Second Language":
            return None
        batches = [row.get_divisions() for row in self.batch_rows]
        batches = [b for b in batches if b]
        if not batches:
            raise ValueError("Division batch mode is ON but no divisions were entered.")
        seen = set()
        for i, batch in enumerate(batches, start=1):
            for d in batch:
                if d in seen:
                    raise ValueError(f"Division '{d}' appears in more than one batch.")
                seen.add(d)
        return batches

    def _load_default_rooms(self):
        """Rooms 1-10, 13-16: 15 benches x 3 seats. Rooms 11-12: 21 benches x 2 seats."""
        if self.room_rows:
            if not messagebox.askyesno(
                    "Replace rooms?",
                    "This will replace your current room list with the default "
                    "16-room setup. Continue?"):
                return
            for row in list(self.room_rows):
                row.destroy()
            self.room_rows = []

        specs = []
        for i in range(1, 11):
            specs.append((f"Room {i}", 15, 3))
        specs.append(("Room 11", 21, 2))
        specs.append(("Room 12", 21, 2))
        for i in range(13, 17):
            specs.append((f"Room {i}", 15, 3))

        for name, benches, seats in specs:
            idx = len(self.room_rows)
            row = RoomRow(self.rooms_scroll, idx, self._remove_room_row,
                          default_name=name, default_benches=benches, default_seats=seats)
            row.grid(row=idx, column=0, sticky="we", pady=2)
            self.room_rows.append(row)

        self.total_rooms_var.set(str(len(self.room_rows)))
        self._refresh_room_capacity_summary()

    def _add_room_row(self):
        idx = len(self.room_rows)
        row = RoomRow(self.rooms_scroll, idx, self._remove_room_row)
        row.grid(row=idx, column=0, sticky="we", pady=2)
        self.room_rows.append(row)
        self._refresh_room_capacity_summary()

    def _remove_room_row(self, row_widget):
        if len(self.room_rows) <= 1:
            messagebox.showinfo("Cannot remove", "At least one room is required.")
            return
        row_widget.destroy()
        self.room_rows.remove(row_widget)
        self._refresh_room_capacity_summary()

    def _set_room_count(self):
        try:
            n = int(self.total_rooms_var.get())
        except ValueError:
            messagebox.showerror("Invalid number", "Enter a valid integer for total rooms.")
            return
        if n < 1:
            return
        current = len(self.room_rows)
        if n > current:
            for _ in range(n - current):
                self._add_room_row()
        elif n < current:
            for row in self.room_rows[n:]:
                row.destroy()
            self.room_rows = self.room_rows[:n]
        self._refresh_room_capacity_summary()

    def _refresh_room_capacity_summary(self):
        total = 0
        for row in self.room_rows:
            try:
                total += int(row.benches_var.get()) * int(row.seats_var.get())
            except ValueError:
                pass
        n_students = len(self.students)
        self.total_capacity_label.configure(
            text=f"Total capacity: {total} seats   |   Students loaded: {n_students}"
        )

    def _save_rooms(self):
        try:
            self.rooms = [row.get_config() for row in self.room_rows]
        except ValueError as e:
            messagebox.showerror("Invalid room configuration", str(e))
            return
        self._refresh_room_capacity_summary()
        self.show_step(2)

    # ------------------------------------------------------------------ #
    # STEP 3 - Generate & Preview
    # ------------------------------------------------------------------ #

    def _build_step3(self):
        frame = ctk.CTkFrame(self.content, fg_color="transparent")
        frame.grid_columnconfigure(0, weight=1)
        frame.grid_rowconfigure(3, weight=1)

        ctk.CTkLabel(frame, text="Step 3 - Generate & Preview",
                     font=ctk.CTkFont(size=22, weight="bold")).grid(
            row=0, column=0, sticky="w", pady=(0, 10))

        ctk.CTkButton(frame, text="Generate Seating Arrangement", height=38,
                      command=self._generate).grid(row=1, column=0, sticky="w")

        self.warnings_box = ctk.CTkTextbox(frame, height=90, fg_color="#FFF7E6", text_color="#7a4a00")
        self.warnings_box.grid(row=2, column=0, sticky="we", pady=10)
        self.warnings_box.insert("1.0", "Warnings will appear here after generation.")
        self.warnings_box.configure(state="disabled")

        preview_frame = ctk.CTkFrame(frame)
        preview_frame.grid(row=3, column=0, sticky="nswe")
        preview_frame.grid_columnconfigure(0, weight=1)
        preview_frame.grid_rowconfigure(1, weight=1)

        top = ctk.CTkFrame(preview_frame, fg_color="transparent")
        top.grid(row=0, column=0, sticky="we", padx=10, pady=(10, 4))
        ctk.CTkLabel(top, text="Preview room:").pack(side="left", padx=(0, 6))
        self.preview_room_var = ctk.StringVar()
        self.preview_room_menu = ctk.CTkOptionMenu(top, variable=self.preview_room_var, values=["-"],
                                                     command=lambda _: self._render_preview())
        self.preview_room_menu.pack(side="left")

        # Use a ttk.Treeview embedded for a proper grid-like preview table
        tree_container = ctk.CTkFrame(preview_frame, fg_color="white")
        tree_container.grid(row=1, column=0, sticky="nswe", padx=10, pady=(0, 10))
        tree_container.grid_columnconfigure(0, weight=1)
        tree_container.grid_rowconfigure(0, weight=1)

        style = ttk.Style()
        style.configure("Preview.Treeview", rowheight=56, font=("Segoe UI", 10))
        style.configure("Preview.Treeview.Heading", font=("Segoe UI", 10, "bold"))

        self.tree = ttk.Treeview(tree_container, show="headings", style="Preview.Treeview")
        self.tree.grid(row=0, column=0, sticky="nswe")
        vsb = ttk.Scrollbar(tree_container, orient="vertical", command=self.tree.yview)
        vsb.grid(row=0, column=1, sticky="ns")
        self.tree.configure(yscrollcommand=vsb.set)

        return frame

    def _generate(self):
        if not self.students:
            messagebox.showwarning("No data", "Please load student data in Step 1 first.")
            return
        if not self.rooms:
            messagebox.showwarning("No rooms", "Please configure rooms in Step 2 first.")
            return

        try:
            division_batches = self._get_division_batches()
        except ValueError as e:
            messagebox.showerror("Invalid batch setup", str(e))
            return

        self.result = sl.assign_seats(
            self.students, self.rooms,
            division_batches=division_batches,
        )
        sl.attach_seat_labels(self.result, self.rooms)
        violations = sl.verify_no_adjacent_same_division(self.result, self.rooms)

        msgs = list(self.result.warnings)
        if violations:
            msgs.append(f"INTERNAL CHECK FAILED: {len(violations)} adjacency violation(s) found.")
            msgs.extend(violations[:5])
        else:
            msgs.append("✓ Verified: no two adjacent seats share the same paper/group in any bench.")

        self.warnings_box.configure(state="normal")
        self.warnings_box.delete("1.0", "end")
        self.warnings_box.insert("1.0", "\n".join(msgs))
        self.warnings_box.configure(state="disabled")

        room_names = [r.name for r in self.rooms]
        self.preview_room_menu.configure(values=room_names)
        if room_names:
            self.preview_room_var.set(room_names[0])
        self._render_preview()

    def _render_preview(self):
        if not self.result or not self.preview_room_var.get():
            return
        room = next(r for r in self.rooms if r.name == self.preview_room_var.get())
        by_room = self.result.by_room()
        seats = by_room.get(room.name, [])

        by_bench = {}
        for a in seats:
            by_bench.setdefault(a.bench_no, {})[a.column] = a

        cols = ["Bench"] + [sl.seat_label(c, room.seats_per_bench) for c in range(1, room.seats_per_bench + 1)]
        self.tree.delete(*self.tree.get_children())
        self.tree["columns"] = cols
        seat_width = 220
        for c in cols:
            self.tree.heading(c, text=c)
            self.tree.column(c, width=seat_width if c != "Bench" else 72, anchor="center", stretch=True)

        for bench_no in range(1, room.num_benches + 1):
            row_vals = [bench_no]
            for c in range(1, room.seats_per_bench + 1):
                a = by_bench.get(bench_no, {}).get(c)
                if a and a.student:
                    div = sl.format_student_division(a.student)
                    row_vals.append(f"{a.student.name}\n\nRoll {a.student.roll_no}  ·  {div}")
                else:
                    row_vals.append("")
            self.tree.insert("", "end", values=row_vals)

    # ------------------------------------------------------------------ #
    # STEP 4 - Export
    # ------------------------------------------------------------------ #

    def _build_step4(self):
        frame = ctk.CTkFrame(self.content, fg_color="transparent")
        frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(frame, text="Step 4 - Export", font=ctk.CTkFont(size=22, weight="bold")
                     ).grid(row=0, column=0, sticky="w", pady=(0, 10))

        ctk.CTkLabel(frame, text="Choose an output folder, then export the files you need.",
                     text_color="#666666").grid(row=1, column=0, sticky="w", pady=(0, 12))

        folder_bar = ctk.CTkFrame(frame, fg_color="transparent")
        folder_bar.grid(row=2, column=0, sticky="we", pady=6)
        ctk.CTkButton(folder_bar, text="Choose Output Folder...", command=self._choose_output_folder
                      ).pack(side="left")
        self.output_folder_label = ctk.CTkLabel(folder_bar, text="No folder selected", text_color="#666666")
        self.output_folder_label.pack(side="left", padx=10)
        self.output_folder = None

        self.export_vars = {
            "seating": ctk.BooleanVar(value=True),
            "notice": ctk.BooleanVar(value=True),
            "attendance": ctk.BooleanVar(value=True),
            "qp_count": ctk.BooleanVar(value=True),
        }
        labels = {
            "seating": "Seating Arrangement (per room)",
            "notice": "Student Notice (by language/group + division for SL & English)",
            "attendance": "Attendance Sheets (per room)",
            "qp_count": "Question Paper Count",
        }
        for i, key in enumerate(["seating", "notice", "attendance", "qp_count"]):
            ctk.CTkCheckBox(frame, text=labels[key], variable=self.export_vars[key]).grid(
                row=3 + i, column=0, sticky="w", pady=4)

        ctk.CTkButton(frame, text="Export Selected Files", height=40,
                      command=self._export).grid(row=8, column=0, sticky="w", pady=(20, 6))

        self.export_status = ctk.CTkLabel(frame, text="", text_color="#1a7a1a", justify="left")
        self.export_status.grid(row=9, column=0, sticky="w", pady=6)

        return frame

    def _choose_output_folder(self):
        folder = filedialog.askdirectory(title="Choose output folder")
        if folder:
            self.output_folder = folder
            self.output_folder_label.configure(text=folder)

    def _export(self):
        if not self.result:
            messagebox.showwarning("Nothing to export", "Please generate the seating arrangement in Step 3 first.")
            return
        if not self.output_folder:
            messagebox.showwarning("No folder", "Please choose an output folder.")
            return

        label = self.session_label_var.get().strip()
        prefix = f"{label}_" if label else ""
        session_type = self.session_type_var.get()
        exam_date = self.custom_date_var.get().strip() if session_type == "Custom" else ""

        created = []
        try:
            if self.export_vars["seating"].get():
                path = os.path.join(self.output_folder, f"{prefix}Seating_Arrangement.xlsx")
                sl.export_seating_arrangement(self.result, self.rooms, path, exam_date=exam_date)
                created.append(path)
            if self.export_vars["notice"].get():
                path = os.path.join(self.output_folder, f"{prefix}Student_Seating_Notice.xlsx")
                sl.export_student_notice(
                    self.result, path, self.division_labels,
                    include_class_division_notices=(
                        session_type in ("Second Language", "English (single group)", "Custom")),
                    exam_date=exam_date,
                )
                created.append(path)
            if self.export_vars["attendance"].get():
                path = os.path.join(self.output_folder, f"{prefix}Attendance_Sheets.xlsx")
                single_date_session = session_type in ("Second Language", "English (single group)", "Custom")
                date_columns = [exam_date] if (session_type == "Custom" and exam_date) else (
                    ["Date"] if single_date_session else None)
                sl.export_attendance_sheets(self.result, self.rooms, path,
                                             date_columns=date_columns,
                                             group_labels=self.division_labels,
                                             exam_date=exam_date)
                created.append(path)
            if self.export_vars["qp_count"].get():
                path = os.path.join(self.output_folder, f"{prefix}Question_Paper_Count.xlsx")
                sl.export_question_paper_count(self.result, self.rooms, path, exam_date=exam_date)
                created.append(path)
        except Exception as e:
            messagebox.showerror("Export failed", str(e))
            return

        self.export_status.configure(
            text="Exported successfully:\n" + "\n".join(created)
        )
        messagebox.showinfo("Done", f"{len(created)} file(s) exported to:\n{self.output_folder}")


def main():
    app = SeatingApp()
    app.mainloop()


if __name__ == "__main__":
    main()
