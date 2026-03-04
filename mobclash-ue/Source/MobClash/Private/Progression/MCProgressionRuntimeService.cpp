#include "Progression/MCProgressionRuntimeService.h"

#include "Algo/Sort.h"
#include "Engine/DataTable.h"

namespace MobClashProgression
{
	static constexpr TCHAR DefaultRankThresholdTablePath[] = TEXT("/Game/DataTables/Progression/DT_RankThresholds.DT_RankThresholds");
	static constexpr TCHAR DefaultCreatureUnlockTablePath[] = TEXT("/Game/DataTables/Progression/DT_CreatureUnlocks.DT_CreatureUnlocks");
}

void UMCProgressionRuntimeService::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	if (RankThresholdTable.IsNull())
	{
		RankThresholdTable = TSoftObjectPtr<UDataTable>(FSoftObjectPath(MobClashProgression::DefaultRankThresholdTablePath));
	}

	if (CreatureUnlockTable.IsNull())
	{
		CreatureUnlockTable = TSoftObjectPtr<UDataTable>(FSoftObjectPath(MobClashProgression::DefaultCreatureUnlockTablePath));
	}

	ReloadProgressionData();
}

bool UMCProgressionRuntimeService::ReloadProgressionData()
{
	CachedRankThresholds.Reset();
	CachedUnlockRows.Reset();

	UDataTable* RankTable = RankThresholdTable.LoadSynchronous();
	if (!RankTable)
	{
		UE_LOG(LogTemp, Warning, TEXT("[Progression] Failed to load rank threshold table: %s"), *RankThresholdTable.ToString());
		return false;
	}

	{
		static const FString RankContext = TEXT("MCProgressionRuntimeService::ReloadProgressionData/RankThresholds");
		TArray<FMCRankThresholdRow*> RankRows;
		RankTable->GetAllRows(RankContext, RankRows);

		for (const FMCRankThresholdRow* Row : RankRows)
		{
			if (Row)
			{
				CachedRankThresholds.Add(*Row);
			}
		}
	}

	Algo::Sort(CachedRankThresholds, [](const FMCRankThresholdRow& A, const FMCRankThresholdRow& B)
	{
		if (A.TotalXPRequired == B.TotalXPRequired)
		{
			return A.Rank < B.Rank;
		}

		return A.TotalXPRequired < B.TotalXPRequired;
	});

	if (CachedRankThresholds.Num() == 0)
	{
		UE_LOG(LogTemp, Warning, TEXT("[Progression] Rank threshold table loaded but had no rows."));
		return false;
	}

	if (UDataTable* UnlockTable = CreatureUnlockTable.LoadSynchronous())
	{
		static const FString UnlockContext = TEXT("MCProgressionRuntimeService::ReloadProgressionData/CreatureUnlocks");
		const TArray<FName> UnlockRowNames = UnlockTable->GetRowNames();

		for (const FName RowName : UnlockRowNames)
		{
			if (const FMCCreatureUnlockRow* UnlockRow = UnlockTable->FindRow<FMCCreatureUnlockRow>(RowName, UnlockContext))
			{
				FUnlockCacheEntry& Entry = CachedUnlockRows.AddDefaulted_GetRef();
				Entry.UnlockId = RowName;
				Entry.Row = *UnlockRow;
			}
		}
	}
	else
	{
		UE_LOG(LogTemp, Warning, TEXT("[Progression] Failed to load creature unlock table: %s"), *CreatureUnlockTable.ToString());
	}

	Algo::Sort(CachedUnlockRows, [](const FUnlockCacheEntry& A, const FUnlockCacheEntry& B)
	{
		if (A.Row.UnlockRank == B.Row.UnlockRank)
		{
			return A.UnlockId.LexicalLess(B.UnlockId);
		}

		return A.Row.UnlockRank < B.Row.UnlockRank;
	});

	return true;
}

bool UMCProgressionRuntimeService::HasLoadedData() const
{
	return CachedRankThresholds.Num() > 0;
}

int32 UMCProgressionRuntimeService::ResolveRankForTotalXP(int32 TotalXP) const
{
	if (CachedRankThresholds.Num() == 0)
	{
		return 1;
	}

	const int32 ClampedXP = FMath::Max(0, TotalXP);
	int32 ResolvedRank = FMath::Max(1, CachedRankThresholds[0].Rank);

	for (const FMCRankThresholdRow& RankRow : CachedRankThresholds)
	{
		if (ClampedXP < RankRow.TotalXPRequired)
		{
			break;
		}

		ResolvedRank = RankRow.Rank;
	}

	return FMath::Max(1, ResolvedRank);
}

FMCXPGrantResult UMCProgressionRuntimeService::GrantXP(FMCPlayerProgressState& ProgressState, int32 XPToGrant)
{
	if (!HasLoadedData())
	{
		ReloadProgressionData();
	}

	FMCXPGrantResult Result;
	Result.PreviousXP = FMath::Max(0, ProgressState.TotalXP);
	Result.GrantedXP = FMath::Max(0, XPToGrant);

	const int64 UnclampedNewXP = static_cast<int64>(Result.PreviousXP) + static_cast<int64>(Result.GrantedXP);
	Result.NewXP = static_cast<int32>(FMath::Min<int64>(UnclampedNewXP, static_cast<int64>(MAX_int32)));

	Result.PreviousRank = ResolveRankForTotalXP(Result.PreviousXP);
	Result.NewRank = ResolveRankForTotalXP(Result.NewXP);
	Result.bRankChanged = Result.NewRank != Result.PreviousRank;

	ProgressState.TotalXP = Result.NewXP;
	ProgressState.CurrentRank = Result.NewRank;

	for (const FUnlockCacheEntry& Unlock : CachedUnlockRows)
	{
		if (Unlock.Row.UnlockRank <= Result.PreviousRank || Unlock.Row.UnlockRank > Result.NewRank)
		{
			continue;
		}

		if (ProgressState.GrantedUnlockIds.Contains(Unlock.UnlockId))
		{
			continue;
		}

		ProgressState.GrantedUnlockIds.Add(Unlock.UnlockId);

		Result.NewlyUnlockedIds.Add(Unlock.UnlockId);

		FMCGrantedUnlockReward& Reward = Result.NewlyUnlockedRewards.AddDefaulted_GetRef();
		Reward.UnlockId = Unlock.UnlockId;
		Reward.CreatureId = Unlock.Row.CreatureId;
		Reward.UnlockRank = Unlock.Row.UnlockRank;
	}

	return Result;
}

int32 UMCProgressionRuntimeService::CalculateMatchXP(bool bWonMatch, bool bFirstMatchOfSession) const
{
	int32 Total = bWonMatch ? MatchWinXP : MatchLossXP;

	if (bFirstMatchOfSession)
	{
		Total += FirstMatchBonusXP;
	}

	return FMath::Max(0, Total);
}
