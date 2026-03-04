#pragma once

#include "CoreMinimal.h"
#include "Data/MCCreatureUnlockRow.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "MCRosterUnlockBridge.generated.h"

class UDataTable;

/**
 * UI-facing unlock state entry derived from progression unlock rows.
 */
USTRUCT(BlueprintType)
struct MOBCLASH_API FMCRosterUnlockEntry
{
	GENERATED_BODY()

	/** Row key from unlock DataTable (stable unique identifier). */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	FName UnlockRowId = NAME_None;

	/** Stable creature id for UI lookup and display mapping. */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	FName CreatureId = NAME_None;

	/** Required rank to unlock creature entry. */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	int32 UnlockRank = 1;

	/** Unlock source metadata from progression table. */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	EMCUnlockType UnlockType = EMCUnlockType::RankReward;

	/** Runtime resolved lock state for the provided player rank. */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	bool bUnlocked = false;

	/** Whether this row should be visible to roster UI. */
	UPROPERTY(BlueprintReadOnly, Category = "Roster")
	bool bVisibleInRoster = true;
};

/**
 * Blueprint bridge for reading creature unlock DataTable rows and exposing
 * locked/unlocked roster entries to UI widgets.
 */
UCLASS()
class MOBCLASH_API UMCRosterUnlockBridge : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/**
	 * Builds roster entries from unlock table rows for the provided rank.
	 * Locked rows are included only when row preview is enabled.
	 */
	UFUNCTION(BlueprintCallable, Category = "MobClash|UI|Roster")
	static void BuildRosterEntriesFromUnlockTable(const UDataTable* UnlockDataTable, int32 CurrentRank, TArray<FMCRosterUnlockEntry>& OutEntries);

	/** Returns true if current rank satisfies unlock requirement for a row. */
	UFUNCTION(BlueprintPure, Category = "MobClash|UI|Roster")
	static bool IsUnlockRowUnlocked(const FMCCreatureUnlockRow& UnlockRow, int32 CurrentRank);
};
