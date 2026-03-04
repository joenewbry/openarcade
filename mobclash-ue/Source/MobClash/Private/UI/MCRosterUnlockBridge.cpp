#include "UI/MCRosterUnlockBridge.h"

#include "Engine/DataTable.h"

void UMCRosterUnlockBridge::BuildRosterEntriesFromUnlockTable(const UDataTable* UnlockDataTable, int32 CurrentRank, TArray<FMCRosterUnlockEntry>& OutEntries)
{
	OutEntries.Reset();

	if (!UnlockDataTable)
	{
		UE_LOG(LogTemp, Warning, TEXT("MCRosterUnlockBridge: UnlockDataTable is null; returning empty roster entries."));
		return;
	}

	const FString ContextString(TEXT("UMCRosterUnlockBridge::BuildRosterEntriesFromUnlockTable"));
	const TArray<FName> RowNames = UnlockDataTable->GetRowNames();

	for (const FName& RowName : RowNames)
	{
		const FMCCreatureUnlockRow* UnlockRow = UnlockDataTable->FindRow<FMCCreatureUnlockRow>(RowName, ContextString, false);
		if (!UnlockRow)
		{
			continue;
		}

		if (UnlockRow->CreatureId.IsNone())
		{
			UE_LOG(LogTemp, Warning, TEXT("MCRosterUnlockBridge: Row %s has invalid CreatureId and was skipped."), *RowName.ToString());
			continue;
		}

		const bool bUnlocked = IsUnlockRowUnlocked(*UnlockRow, CurrentRank);
		const bool bVisible = bUnlocked || UnlockRow->bPreviewInRosterBeforeUnlock;
		if (!bVisible)
		{
			continue;
		}

		FMCRosterUnlockEntry& Entry = OutEntries.AddDefaulted_GetRef();
		Entry.UnlockRowId = RowName;
		Entry.CreatureId = UnlockRow->CreatureId;
		Entry.UnlockRank = UnlockRow->UnlockRank;
		Entry.UnlockType = UnlockRow->UnlockType;
		Entry.bUnlocked = bUnlocked;
		Entry.bVisibleInRoster = bVisible;
	}

	OutEntries.Sort([](const FMCRosterUnlockEntry& A, const FMCRosterUnlockEntry& B)
	{
		if (A.UnlockRank != B.UnlockRank)
		{
			return A.UnlockRank < B.UnlockRank;
		}

		return A.UnlockRowId.ToString() < B.UnlockRowId.ToString();
	});
}

bool UMCRosterUnlockBridge::IsUnlockRowUnlocked(const FMCCreatureUnlockRow& UnlockRow, int32 CurrentRank)
{
	const int32 RequiredRank = FMath::Max(1, UnlockRow.UnlockRank);
	return CurrentRank >= RequiredRank;
}
