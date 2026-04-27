#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "UI/MCMenuTypes.h"
#include "MCSubMenuWidget.generated.h"

class UButton;
class UTextBlock;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FMCSubMenuBackRequested, EMCMenuScreen, FromScreen);

/**
 * Placeholder submenu shell used by Roster/Progress/Settings.
 *
 * Expected widget blueprint bindings:
 * - BackButton
 * - HeaderText
 */
UCLASS(Abstract, BlueprintType)
class MOBCLASH_API UMCSubMenuWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintAssignable, Category = "Menu")
	FMCSubMenuBackRequested OnBackRequested;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Menu")
	EMCMenuScreen ScreenId = EMCMenuScreen::Settings;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Menu")
	FText ScreenTitle;

	UFUNCTION(BlueprintCallable, Category = "Menu")
	void RefreshHeader();

protected:
	virtual void NativePreConstruct() override;
	virtual void NativeConstruct() override;
	virtual void NativeDestruct() override;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UButton> BackButton;

	UPROPERTY(meta = (BindWidgetOptional), BlueprintReadOnly)
	TObjectPtr<UTextBlock> HeaderText;

private:
	UFUNCTION()
	void HandleBackClicked();
};
